package com.quickcode.module.auditing;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

public final class AuditLogFactory {

    private static final ObjectMapper JSON = new ObjectMapper();

    private AuditLogFactory() {}

    public static AuditLogPayload createHttpRequestAudit(
            String correlationId,
            String method,
            String path,
            String userId,
            String userGroup,
            String clientId,
            String userAgent,
            String ipAddress,
            int statusCode,
            long durationMs,
            String requestModule,
            String changeSummary) {
        AuditLogPayload log = new AuditLogPayload();
        log.id = UUID.randomUUID().toString();
        log.entityName = "HttpRequest";
        log.entityId = correlationId;
        log.action = method;
        log.userId = userId;
        log.userGroup = userGroup;
        log.clientId = clientId;
        log.timestamp = Instant.now();
        log.durationMs = durationMs;
        log.statusCode = statusCode;
        log.requestModule = requestModule;
        log.requestPath = path;
        log.ipAddress = ipAddress;
        log.userAgent = userAgent;
        log.correlationId = correlationId;
        log.changeSummary = changeSummary;
        log.isSuccess = statusCode < 400;
        log.isChanged = false;
        log.newValues = newValuesJson(method, path, statusCode, durationMs, userGroup, clientId);
        return log;
    }

    private static String newValuesJson(
            String method,
            String path,
            int statusCode,
            long durationMs,
            String userGroup,
            String clientId) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("method", method);
        map.put("path", path);
        map.put("statusCode", statusCode);
        map.put("durationMs", durationMs);
        if (userGroup != null && !userGroup.isBlank()) {
            map.put("userGroup", userGroup);
        }
        if (clientId != null && !clientId.isBlank()) {
            map.put("clientId", clientId);
        }
        try {
            return JSON.writeValueAsString(map);
        } catch (JsonProcessingException ex) {
            return "{\"method\":\"" + method + "\",\"path\":\"" + path + "\"}";
        }
    }
}
