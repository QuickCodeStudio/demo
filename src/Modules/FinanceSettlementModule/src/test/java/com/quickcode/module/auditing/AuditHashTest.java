package com.quickcode.module.auditing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class AuditHashTest {

    @Test
    void computeHashIsDeterministic() {
        AuditLogPayload log = new AuditLogPayload();
        log.entityName = "HttpRequest";
        log.entityId = "corr-1";
        log.action = "GET";
        log.userId = "anonymous";
        log.timestamp = Instant.parse("2026-01-01T00:00:00.000Z");
        log.oldValues = "";
        log.newValues = "{\"a\":1}";

        String a = AuditHash.compute(log);
        String b = AuditHash.compute(log);
        assertEquals(a, b);
        assertTrue(a.length() > 10);
    }
}
