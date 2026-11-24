/**
 * Nest parity of C# InMemoryIdempotencyStore / IIdempotencyStore: caches endpoint workflow responses
 * keyed by `endpoint|{workflowName}|{Idempotency-Key}` so retried requests replay the original response.
 * Process-local only; swap in a durable implementation via the IDEMPOTENCY_STORE injection token.
 */

export interface IdempotencyRecord {
  key: string;
  statusCode: number;
  /** Serialized JSON response body, replayed verbatim. */
  body: string;
  correlationId?: string;
  createdAt: Date;
}

export interface IdempotencyStore {
  tryGet(key: string): Promise<IdempotencyRecord | undefined>;
  save(record: Omit<IdempotencyRecord, 'createdAt'> & { createdAt?: Date }): Promise<void>;
}

/** Nest injection token (optional) for overriding the idempotency store used by EndpointWorkflowMiddleware. */
export const IDEMPOTENCY_STORE = Symbol('IDEMPOTENCY_STORE');

/** Upper bound on retained records; oldest entries are evicted first so long-running processes do not leak. */
const MAX_RETAINED_RECORDS = 10_000;

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly items = new Map<string, IdempotencyRecord>();

  async tryGet(key: string): Promise<IdempotencyRecord | undefined> {
    const record = this.items.get(key);
    return record ? { ...record } : undefined;
  }

  async save(record: Omit<IdempotencyRecord, 'createdAt'> & { createdAt?: Date }): Promise<void> {
    // Re-insert so the entry becomes the newest for eviction ordering.
    this.items.delete(record.key);
    this.items.set(record.key, { ...record, createdAt: record.createdAt ?? new Date() });
    while (this.items.size > MAX_RETAINED_RECORDS) {
      const oldest = this.items.keys().next().value;
      if (oldest === undefined) break;
      this.items.delete(oldest);
    }
  }
}

/** Process-wide default store (C# singleton registration). */
export const sharedInMemoryIdempotencyStore = new InMemoryIdempotencyStore();
