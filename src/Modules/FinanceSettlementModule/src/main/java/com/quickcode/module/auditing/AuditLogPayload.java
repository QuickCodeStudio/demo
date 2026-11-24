package com.quickcode.module.auditing;

import java.time.Instant;

/** Nest / C# AuditLogPayload parity for AUDIT_LOGS inserts. */
public class AuditLogPayload {

    public String id;
    public String entityName;
    public String entityId;
    public String action;
    public String userId;
    public String userName;
    public String userGroup;
    public Instant timestamp;
    public Long durationMs;
    public Integer statusCode;
    public String requestModule;
    public String requestPath;
    public String oldValues;
    public String newValues;
    public String changedColumns;
    public boolean isChanged;
    public String changeSummary;
    public String ipAddress;
    public String userAgent;
    public String clientId;
    public String correlationId;
    public boolean isSuccess;
    public String errorMessage;
    public String hash;
}
