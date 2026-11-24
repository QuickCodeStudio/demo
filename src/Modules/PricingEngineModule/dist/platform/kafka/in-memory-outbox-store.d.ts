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
export type OutboxMessageInput = Pick<OutboxMessage, 'topic' | 'key' | 'payload'> & Partial<Pick<OutboxMessage, 'id' | 'correlationId'>>;
export interface OutboxStore {
    enqueue(message: OutboxMessageInput): Promise<OutboxMessage>;
    dequeuePending(take: number): Promise<OutboxMessage[]>;
    markSent(id: string): Promise<void>;
    markFailed(id: string, error: string): Promise<void>;
}
export declare const OUTBOX_STORE: unique symbol;
export declare class InMemoryOutboxStore implements OutboxStore {
    private readonly items;
    private sentCount;
    enqueue(message: OutboxMessageInput): Promise<OutboxMessage>;
    dequeuePending(take: number): Promise<OutboxMessage[]>;
    markSent(id: string): Promise<void>;
    markFailed(id: string, error: string): Promise<void>;
    snapshot(): Promise<OutboxMessage[]>;
    private evictSent;
}
export declare const sharedInMemoryOutboxStore: InMemoryOutboxStore;
