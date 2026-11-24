import { lastValueFrom, of, throwError } from 'rxjs';
import { InMemoryOutboxStore } from './in-memory-outbox-store';
import { KafkaPublishInterceptor, buildStableKey } from './kafka-publish.interceptor';
import { OutboxDispatcherService } from './outbox-dispatcher.service';

function ctx(req: any, res: any, handler: unknown = () => undefined): any {
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    getHandler: () => handler,
  };
}

function mockReq(method = 'POST', path = '/api/orders', headers: Record<string, string> = {}): any {
  return { method, path, url: path, headers, body: { name: 'x', password: 'secret' } };
}

function mockRes(statusCode = 200): any {
  return { statusCode, getHeaders: () => ({}) };
}

describe('KafkaPublishInterceptor', () => {
  const catalog = {
    findAsync: jest.fn().mockResolvedValue({ topicName: 'orders_post' }),
  } as any;

  beforeEach(() => catalog.findAsync.mockClear());

  it('enqueues to the outbox instead of producing, keyed by business id', async () => {
    const outbox = new InMemoryOutboxStore();
    const interceptor = new KafkaPublishInterceptor(catalog, outbox);
    const next = { handle: () => of({ id: 42, ok: true }) };

    const result = await lastValueFrom(interceptor.intercept(ctx(mockReq(), mockRes()), next));
    expect(result).toEqual({ id: 42, ok: true });

    const pending = await outbox.dequeuePending(10);
    expect(pending).toHaveLength(1);
    expect(pending[0].topic).toBe('orders_post');
    expect(pending[0].key).toBe('POST|/api/orders|42');
    const payload = JSON.parse(pending[0].payload);
    expect(payload.responseInfo.statusCode).toBe(201); // Nest POST default
    expect(payload.requestInfo.body.password).not.toBe('secret');
  });

  it('falls back to the correlation id for the key (stable, not Date.now)', async () => {
    const outbox = new InMemoryOutboxStore();
    const interceptor = new KafkaPublishInterceptor(catalog, outbox);
    const req = mockReq('PUT', '/api/orders/1', { 'x-correlation-id': 'corr-9' });
    await lastValueFrom(interceptor.intercept(ctx(req, mockRes()), { handle: () => of({ ok: true }) }));
    const [msg] = await outbox.dequeuePending(10);
    expect(msg.key).toBe('PUT|/api/orders/1|corr-9');
    expect(msg.correlationId).toBe('corr-9');
  });

  it('skips when the response status is >= 400', async () => {
    const outbox = new InMemoryOutboxStore();
    const interceptor = new KafkaPublishInterceptor(catalog, outbox);
    await lastValueFrom(
      interceptor.intercept(ctx(mockReq(), mockRes(404)), { handle: () => of({ error: 'nf' }) }),
    );
    expect(await outbox.dequeuePending(10)).toEqual([]);
  });

  it('does not enqueue when the handler throws', async () => {
    const outbox = new InMemoryOutboxStore();
    const interceptor = new KafkaPublishInterceptor(catalog, outbox);
    await expect(
      lastValueFrom(interceptor.intercept(ctx(mockReq(), mockRes()), { handle: () => throwError(() => new Error('bad')) })),
    ).rejects.toThrow('bad');
    expect(await outbox.dequeuePending(10)).toEqual([]);
  });

  it('skips excluded paths and uncatalogued routes', async () => {
    const outbox = new InMemoryOutboxStore();
    const interceptor = new KafkaPublishInterceptor(catalog, outbox);
    await lastValueFrom(
      interceptor.intercept(ctx(mockReq('GET', '/swagger/index.html'), mockRes()), { handle: () => of({}) }),
    );
    expect(catalog.findAsync).not.toHaveBeenCalled();

    catalog.findAsync.mockResolvedValueOnce(null);
    await lastValueFrom(interceptor.intercept(ctx(mockReq(), mockRes()), { handle: () => of({}) }));
    expect(await outbox.dequeuePending(10)).toEqual([]);
  });

  it('interceptor enqueue + dispatcher drain produces to Kafka', async () => {
    const outbox = new InMemoryOutboxStore();
    const produce = jest.fn().mockResolvedValue(undefined);
    const interceptor = new KafkaPublishInterceptor(catalog, outbox);
    const dispatcher = new OutboxDispatcherService({ produceAsync: produce } as any, outbox);

    await lastValueFrom(interceptor.intercept(ctx(mockReq(), mockRes()), { handle: () => of({ id: 'a1' }) }));
    expect(produce).not.toHaveBeenCalled();

    await dispatcher.drainOnce();
    expect(produce).toHaveBeenCalledTimes(1);
    expect(produce.mock.calls[0][0]).toBe('orders_post');
    expect(produce.mock.calls[0][1]).toBe('POST|/api/orders|a1');
  });
});

describe('buildStableKey', () => {
  it('prefers id / Id, otherwise correlation id', () => {
    expect(buildStableKey('POST', '/p', 'c', { id: 'x' })).toBe('POST|/p|x');
    expect(buildStableKey('POST', '/p', 'c', { Id: 7 })).toBe('POST|/p|7');
    expect(buildStableKey('POST', '/p', 'c', { id: '' })).toBe('POST|/p|c');
    expect(buildStableKey('POST', '/p', 'c', null)).toBe('POST|/p|c');
    expect(buildStableKey('POST', '/p', 'c', [{ id: 1 }])).toBe('POST|/p|c');
  });
});
