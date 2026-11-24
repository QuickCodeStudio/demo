package com.quickcode.module.auditing;

import org.springframework.stereotype.Component;

@Component
public class NullAuditLogWriter implements AuditLogWriter {

    @Override
    public void queueAuditLog(AuditLogPayload auditLog) {
        // no-op
    }
}
