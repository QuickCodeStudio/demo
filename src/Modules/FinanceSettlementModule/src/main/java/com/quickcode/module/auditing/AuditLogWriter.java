package com.quickcode.module.auditing;

public interface AuditLogWriter {

    void queueAuditLog(AuditLogPayload auditLog);
}
