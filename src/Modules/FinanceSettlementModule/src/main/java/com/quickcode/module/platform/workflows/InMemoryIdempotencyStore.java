package com.quickcode.module.platform.workflows;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Process-local idempotency store (C# {@code InMemoryIdempotencyStore} parity).
 * Swap for a shared store when multi-instance durability is required.
 */
public class InMemoryIdempotencyStore {
    private final ConcurrentMap<String, IdempotencyRecord> items = new ConcurrentHashMap<>();

    public Optional<IdempotencyRecord> tryGet(String key) {
        return key == null ? Optional.empty() : Optional.ofNullable(items.get(key));
    }

    public void save(IdempotencyRecord record) {
        items.put(record.key(), record);
    }

    public int size() {
        return items.size();
    }
}
