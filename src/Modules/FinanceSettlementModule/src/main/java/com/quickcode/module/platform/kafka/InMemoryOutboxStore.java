package com.quickcode.module.platform.kafka;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Process-local outbox (C# {@code InMemoryOutboxStore} parity).
 * Sent messages are evicted so the store does not grow unbounded.
 */
public class InMemoryOutboxStore {
    private final ConcurrentMap<UUID, OutboxMessage> items = new ConcurrentHashMap<>();

    public void enqueue(OutboxMessage message) {
        items.put(message.id(), message);
    }

    /** Oldest-first pending (unsent) messages, at most {@code take} (min 1). */
    public List<OutboxMessage> dequeuePending(int take) {
        return items.values().stream()
                .filter(m -> m.sentAt() == null)
                .sorted(Comparator.comparing(OutboxMessage::createdAt))
                .limit(Math.max(1, take))
                .toList();
    }

    public void markSent(UUID id) {
        OutboxMessage message = items.remove(id);
        if (message != null) {
            message.sentAt(Instant.now());
            message.lastError(null);
        }
    }

    public void markFailed(UUID id, String error) {
        OutboxMessage message = items.get(id);
        if (message != null) {
            message.incrementAttempts();
            message.lastError(error);
        }
    }

    public int pendingCount() {
        return (int) items.values().stream().filter(m -> m.sentAt() == null).count();
    }
}
