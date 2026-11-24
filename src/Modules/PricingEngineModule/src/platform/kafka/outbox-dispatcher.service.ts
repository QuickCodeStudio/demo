import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { KafkaProducerService } from './kafka-producer.service';
import { OUTBOX_STORE, OutboxStore, sharedInMemoryOutboxStore } from './in-memory-outbox-store';

const BATCH_SIZE = 20;

/**
 * Nest parity of C# OutboxDispatcherHostedService: polls the outbox and produces to Kafka,
 * marking each message sent or failed (failed messages stay pending and are retried next poll).
 * Poll interval: `Kafka__OutboxPollSeconds` / `KAFKA_OUTBOX_POLL_SECONDS` (default 2s, minimum 1s).
 */
@Injectable()
export class OutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private readonly outbox: OutboxStore;
  private timer: NodeJS.Timeout | null = null;
  private draining = false;

  constructor(
    private readonly producer: KafkaProducerService,
    @Optional() @Inject(OUTBOX_STORE) outbox?: OutboxStore,
  ) {
    this.outbox = outbox ?? sharedInMemoryOutboxStore;
  }

  onModuleInit(): void {
    this.start();
  }

  onModuleDestroy(): void {
    this.stop();
  }

  start(): void {
    if (this.timer) return;
    const intervalMs = resolvePollSeconds() * 1000;
    this.timer = setInterval(() => {
      void this.drainOnce();
    }, intervalMs);
    this.timer.unref?.();
    this.logger.log(`Outbox dispatcher started. PollSeconds=${intervalMs / 1000}`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Drains one batch; returns the number of messages produced successfully. Never throws. */
  async drainOnce(): Promise<number> {
    if (this.draining) return 0;
    this.draining = true;
    let sent = 0;
    try {
      const batch = await this.outbox.dequeuePending(BATCH_SIZE);
      for (const message of batch) {
        try {
          await this.producer.produceAsync(message.topic, message.key, message.payload);
          await this.outbox.markSent(message.id);
          sent++;
          this.logger.log(
            `Outbox sent. Id=${message.id} Topic=${message.topic} CorrelationId=${message.correlationId ?? ''}`,
          );
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          await this.outbox.markFailed(message.id, error);
          this.logger.error(
            `Outbox produce failed. Id=${message.id} Topic=${message.topic}: ${error}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(`Outbox dispatcher loop error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.draining = false;
    }
    return sent;
  }
}

export function resolvePollSeconds(): number {
  const raw = process.env.KAFKA_OUTBOX_POLL_SECONDS ?? process.env.Kafka__OutboxPollSeconds;
  const parsed = raw === undefined || raw.trim() === '' ? NaN : Number(raw);
  if (!Number.isFinite(parsed)) return 2;
  return Math.max(1, parsed);
}
