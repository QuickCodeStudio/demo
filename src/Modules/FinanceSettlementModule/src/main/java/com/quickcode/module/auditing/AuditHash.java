package com.quickcode.module.auditing;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

public final class AuditHash {

    private AuditHash() {}

    public static String compute(AuditLogPayload auditLog) {
        String data =
                auditLog.entityName
                        + "|"
                        + auditLog.entityId
                        + "|"
                        + auditLog.action
                        + "|"
                        + nullToEmpty(auditLog.userId)
                        + "|"
                        + auditLog.timestamp.toString()
                        + "|"
                        + nullToEmpty(auditLog.oldValues)
                        + "|"
                        + nullToEmpty(auditLog.newValues);
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashed);
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
