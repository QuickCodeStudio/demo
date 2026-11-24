package com.quickcode.module.platform.workflows;

import java.time.Instant;

/** C# {@code IdempotencyRecord} parity: cached endpoint-workflow response keyed by idempotency key. */
public record IdempotencyRecord(String key, int statusCode, String body, String correlationId, Instant createdAt) {

    public IdempotencyRecord(String key, int statusCode, String body, String correlationId) {
        this(key, statusCode, body, correlationId, Instant.now());
    }
}
