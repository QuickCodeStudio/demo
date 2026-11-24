"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sharedInMemoryIdempotencyStore = exports.InMemoryIdempotencyStore = exports.IDEMPOTENCY_STORE = void 0;
exports.IDEMPOTENCY_STORE = Symbol('IDEMPOTENCY_STORE');
const MAX_RETAINED_RECORDS = 10_000;
class InMemoryIdempotencyStore {
    constructor() {
        this.items = new Map();
    }
    async tryGet(key) {
        const record = this.items.get(key);
        return record ? { ...record } : undefined;
    }
    async save(record) {
        this.items.delete(record.key);
        this.items.set(record.key, { ...record, createdAt: record.createdAt ?? new Date() });
        while (this.items.size > MAX_RETAINED_RECORDS) {
            const oldest = this.items.keys().next().value;
            if (oldest === undefined)
                break;
            this.items.delete(oldest);
        }
    }
}
exports.InMemoryIdempotencyStore = InMemoryIdempotencyStore;
exports.sharedInMemoryIdempotencyStore = new InMemoryIdempotencyStore();
//# sourceMappingURL=in-memory-idempotency-store.js.map