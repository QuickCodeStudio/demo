import { randomUUID } from 'crypto';

/**
 * Nest parity of C# InMemoryOutboxStore / IOutboxStore: Kafka events are enqueued here by
 * KafkaPublishInterceptor and drained by OutboxDispatcherService.
 * Process-local only; swap in a durable implementation via the OUTBOX_STORE injection token.
 */

export interface OutboxMessage {
  id: string;
  topic: string;
  key: string;
  payload: string;
  correlationId?: string;
  createdAt: Date;
  sentAt?: Date;
  attemptCount: number;
  lastError?: string;
}

export type OutboxMessageInput = Pick<OutboxMessage, 'topic' | 'key' | 'payload'> &
  Partial<Pick<OutboxMessage, 'id' | 'correlationId'>>;

export interface OutboxStore {
  enqueue(message: OutboxMessageInput): Promise<OutboxMessage>;
  /** Oldest unsent messages first (at least 1). */
  dequeuePending(take: number): Promise<OutboxMessage[]>;
  markSent(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}

/** Nest injection token (optional) for overriding the outbox store. */
export const OUTBOX_STORE = Symbol('OUTBOX_STORE');

/** Upper bound on already-sent messages retained (pending messages are never evicted). */
const MAX_RETAINED_SENT = 1_000;

export class InMemoryOutboxStore implements OutboxStore {
  private readonly items = new Map<string, OutboxMessage>();
  private sentCount = 0;

  async enqueue(message: OutboxMessageInput): Promise<OutboxMessage> {
    const stored: OutboxMessage = {
      id: message.id ?? randomUUID(),
      topic: message.topic,
      key: message.key,
      payload: message.payload,
      correlationId: message.correlationId,
      createdAt: new Date(),
      attemptCount: 0,
    };
    this.items.set(stored.id, stored);
    return { ...stored };
  }

  async dequeuePending(take: number): Promise<OutboxMessage[]> {
    const limit = Math.max(1, Math.floor(take) || 1);
    const pending: OutboxMessage[] = [];
    // Map preserves insertion order == creation order.
    for (const message of this.items.values()) {
      if (message.sentAt) continue;
      pending.push({ ...message });
      if (pending.length >= limit) break;
    }
    return pending;
  }

  async markSent(id: string): Promise<void> {
    const message = this.items.get(id);
    if (!message || message.sentAt) return;
    message.sentAt = new Date();
    message.lastError = undefined;
    this.sentCount++;
    this.evictSent();
  }

  async markFailed(id: string, error: string): Promise<void> {
    const message = this.items.get(id);
    if (!message) return;
    message.attemptCount++;
    message.lastError = error;
  }

  /** Test/diagnostic helper: snapshot of all retained messages. */
  async snapshot(): Promise<OutboxMessage[]> {
    return [...this.items.values()].map((m) => ({ ...m }));
  }

  private evictSent(): void {
    if (this.sentCount <= MAX_RETAINED_SENT) return;
    for (const [id, message] of this.items) {
      if (this.sentCount <= MAX_RETAINED_SENT) break;
      if (message.sentAt) {
        this.items.delete(id);
        this.sentCount--;
      }
    }
  }
}

/** Process-wide default store (C# singleton registration). */
export const sharedInMemoryOutboxStore = new InMemoryOutboxStore();
