package com.quickcode.module.platform.kafka;

import java.time.Instant;
import java.util.UUID;

/** C# {@code OutboxMessage} parity (mutable delivery state, thread-safe via volatile fields). */
public final class OutboxMessage {
    private final UUID id = UUID.randomUUID();
    private final String topic;
    private final String key;
    private final String payload;
    private final String correlationId;
    private final Instant createdAt = Instant.now();
    private volatile Instant sentAt;
    private volatile int attemptCount;
    private volatile String lastError;

    public OutboxMessage(String topic, String key, String payload, String correlationId) {
        this.topic = topic;
        this.key = key;
        this.payload = payload;
        this.correlationId = correlationId;
    }

    public UUID id() {
        return id;
    }

    public String topic() {
        return topic;
    }

    public String key() {
        return key;
    }

    public String payload() {
        return payload;
    }

    public String correlationId() {
        return correlationId;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant sentAt() {
        return sentAt;
    }

    void sentAt(Instant value) {
        this.sentAt = value;
    }

    public int attemptCount() {
        return attemptCount;
    }

    synchronized void incrementAttempts() {
        this.attemptCount++;
    }

    public String lastError() {
        return lastError;
    }

    void lastError(String value) {
        this.lastError = value;
    }
}
