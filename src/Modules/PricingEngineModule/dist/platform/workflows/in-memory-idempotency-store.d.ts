export interface IdempotencyRecord {
    key: string;
    statusCode: number;
    body: string;
    correlationId?: string;
    createdAt: Date;
}
export interface IdempotencyStore {
    tryGet(key: string): Promise<IdempotencyRecord | undefined>;
    save(record: Omit<IdempotencyRecord, 'createdAt'> & {
        createdAt?: Date;
    }): Promise<void>;
}
export declare const IDEMPOTENCY_STORE: unique symbol;
export declare class InMemoryIdempotencyStore implements IdempotencyStore {
    private readonly items;
    tryGet(key: string): Promise<IdempotencyRecord | undefined>;
    save(record: Omit<IdempotencyRecord, 'createdAt'> & {
        createdAt?: Date;
    }): Promise<void>;
}
export declare const sharedInMemoryIdempotencyStore: InMemoryIdempotencyStore;
