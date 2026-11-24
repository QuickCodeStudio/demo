"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sharedInMemoryOutboxStore = exports.InMemoryOutboxStore = exports.OUTBOX_STORE = void 0;
const crypto_1 = require("crypto");
exports.OUTBOX_STORE = Symbol('OUTBOX_STORE');
const MAX_RETAINED_SENT = 1_000;
class InMemoryOutboxStore {
    constructor() {
        this.items = new Map();
        this.sentCount = 0;
    }
    async enqueue(message) {
        const stored = {
            id: message.id ?? (0, crypto_1.randomUUID)(),
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
    async dequeuePending(take) {
        const limit = Math.max(1, Math.floor(take) || 1);
        const pending = [];
        for (const message of this.items.values()) {
            if (message.sentAt)
                continue;
            pending.push({ ...message });
            if (pending.length >= limit)
                break;
        }
        return pending;
    }
    async markSent(id) {
        const message = this.items.get(id);
        if (!message || message.sentAt)
            return;
        message.sentAt = new Date();
        message.lastError = undefined;
        this.sentCount++;
        this.evictSent();
    }
    async markFailed(id, error) {
        const message = this.items.get(id);
        if (!message)
            return;
        message.attemptCount++;
        message.lastError = error;
    }
    async snapshot() {
        return [...this.items.values()].map((m) => ({ ...m }));
    }
    evictSent() {
        if (this.sentCount <= MAX_RETAINED_SENT)
            return;
        for (const [id, message] of this.items) {
            if (this.sentCount <= MAX_RETAINED_SENT)
                break;
            if (message.sentAt) {
                this.items.delete(id);
                this.sentCount--;
            }
        }
    }
}
exports.InMemoryOutboxStore = InMemoryOutboxStore;
exports.sharedInMemoryOutboxStore = new InMemoryOutboxStore();
//# sourceMappingURL=in-memory-outbox-store.js.map