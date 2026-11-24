import { InMemoryOutboxStore } from './in-memory-outbox-store';
import { OutboxDispatcherService, resolvePollSeconds } from './outbox-dispatcher.service';

function producerMock(impl?: jest.Mock) {
  return { produceAsync: impl ?? jest.fn().mockResolvedValue(undefined) } as any;
}

describe('InMemoryOutboxStore', () => {
  it('enqueues and dequeues oldest pending first, honoring take', async () => {
    const store = new InMemoryOutboxStore();
    for (const key of ['a', 'b', 'c']) await store.enqueue({ topic: 't', key, payload: key });
    const batch = await store.dequeuePending(2);
    expect(batch.map((m) => m.key)).toEqual(['a', 'b']);
    expect(batch[0].attemptCount).toBe(0);
  });

  it('markSent removes message from pending', async () => {
    const store = new InMemoryOutboxStore();
    const m = await store.enqueue({ topic: 't', key: 'a', payload: 'p' });
    await store.markSent(m.id);
    expect(await store.dequeuePending(10)).toEqual([]);
  });

  it('markFailed keeps message pending and records attempt + error', async () => {
    const store = new InMemoryOutboxStore();
    const m = await store.enqueue({ topic: 't', key: 'a', payload: 'p' });
    await store.markFailed(m.id, 'broker down');
    const [pending] = await store.dequeuePending(10);
    expect(pending.attemptCount).toBe(1);
    expect(pending.lastError).toBe('broker down');
  });
});

describe('OutboxDispatcherService', () => {
  it('drains enqueued messages through produceAsync and marks them sent', async () => {
    const store = new InMemoryOutboxStore();
    await store.enqueue({ topic: 'orders_post', key: 'POST|/x|1', payload: '{"a":1}' });
    const produce = jest.fn().mockResolvedValue(undefined);
    const dispatcher = new OutboxDispatcherService(producerMock(produce), store);

    expect(await dispatcher.drainOnce()).toBe(1);
    expect(produce).toHaveBeenCalledWith('orders_post', 'POST|/x|1', '{"a":1}');
    expect(await store.dequeuePending(10)).toEqual([]);
    expect(await dispatcher.drainOnce()).toBe(0);
    expect(produce).toHaveBeenCalledTimes(1);
  });

  it('marks failed messages and retries them on the next drain', async () => {
    const store = new InMemoryOutboxStore();
    await store.enqueue({ topic: 't', key: 'k', payload: 'p' });
    const produce = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    const dispatcher = new OutboxDispatcherService(producerMock(produce), store);

    expect(await dispatcher.drainOnce()).toBe(0);
    const [pending] = await store.dequeuePending(10);
    expect(pending.attemptCount).toBe(1);
    expect(pending.lastError).toBe('boom');

    expect(await dispatcher.drainOnce()).toBe(1);
    expect(await store.dequeuePending(10)).toEqual([]);
  });

  it('drains in batches of 20', async () => {
    const store = new InMemoryOutboxStore();
    for (let i = 0; i < 25; i++) await store.enqueue({ topic: 't', key: `k${i}`, payload: 'p' });
    const dispatcher = new OutboxDispatcherService(producerMock(), store);
    expect(await dispatcher.drainOnce()).toBe(20);
    expect(await dispatcher.drainOnce()).toBe(5);
  });

  describe('polling', () => {
    afterEach(() => {
      jest.useRealTimers();
      delete process.env.KAFKA_OUTBOX_POLL_SECONDS;
      delete process.env.Kafka__OutboxPollSeconds;
    });

    it('onModuleInit polls on the configured interval and onModuleDestroy stops it', async () => {
      jest.useFakeTimers();
      process.env.KAFKA_OUTBOX_POLL_SECONDS = '3';
      const store = new InMemoryOutboxStore();
      const produce = jest.fn().mockResolvedValue(undefined);
      const dispatcher = new OutboxDispatcherService(producerMock(produce), store);
      dispatcher.onModuleInit();

      await store.enqueue({ topic: 't', key: 'k', payload: 'p' });
      await jest.advanceTimersByTimeAsync(2_900);
      expect(produce).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(200);
      expect(produce).toHaveBeenCalledTimes(1);

      dispatcher.onModuleDestroy();
      await store.enqueue({ topic: 't', key: 'k2', payload: 'p' });
      await jest.advanceTimersByTimeAsync(10_000);
      expect(produce).toHaveBeenCalledTimes(1);
    });

    it('resolves poll seconds from env with default 2 and minimum 1', () => {
      expect(resolvePollSeconds()).toBe(2);
      process.env.Kafka__OutboxPollSeconds = '5';
      expect(resolvePollSeconds()).toBe(5);
      process.env.KAFKA_OUTBOX_POLL_SECONDS = '0';
      expect(resolvePollSeconds()).toBe(1);
      process.env.KAFKA_OUTBOX_POLL_SECONDS = 'abc';
      expect(resolvePollSeconds()).toBe(2);
    });
  });
});
