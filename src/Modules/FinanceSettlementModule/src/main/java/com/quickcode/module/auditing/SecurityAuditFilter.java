package com.quickcode.module.auditing;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;

public class SecurityAuditFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(SecurityAuditFilter.class);

    private final AuditLogWriter auditLogWriter;

    public SecurityAuditFilter(AuditLogWriter auditLogWriter) {
        this.auditLogWriter = auditLogWriter;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (HealthPathUtil.isHealthPath(path) || isSwaggerPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        long started = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = System.currentTimeMillis() - started;
            int status = response.getStatus();
            String correlationId = resolveCorrelationId(request);
            String userId = resolveUserId(request);
            String userGroup = resolveUserGroup(request);
            String clientId = resolveClientId(request);
            String changeSummary = resolveChangeSummary(request);
            String module = env("MODULE_NAME", "Template0ModuleName");
            AuditLogPayload audit =
                    AuditLogFactory.createHttpRequestAudit(
                            correlationId,
                            request.getMethod(),
                            path,
                            userId,
                            userGroup,
                            clientId,
                            header(request, "User-Agent"),
                            clientIp(request),
                            status,
                            durationMs,
                            module,
                            changeSummary);
            auditLogWriter.queueAuditLog(audit);
            log.debug(
                    "Security Audit: {} {} - User: {} - Group: {} - ClientId: {} - Status: {} - Duration: {}ms",
                    request.getMethod(),
                    path,
                    userId,
                    userGroup,
                    clientId,
                    status,
                    durationMs);
        }
    }

    private static boolean isSwaggerPath(String path) {
        return path != null && path.toLowerCase(Locale.ROOT).startsWith("/swagger");
    }

    private static String resolveCorrelationId(HttpServletRequest request) {
        String fromHeader = header(request, "x-correlation-id");
        if (!fromHeader.isBlank()) {
            return fromHeader;
        }
        fromHeader = header(request, "x-request-id");
        if (!fromHeader.isBlank()) {
            return fromHeader;
        }
        return UUID.randomUUID().toString();
    }

    private static String resolveUserId(HttpServletRequest request) {
        String fromHeader = header(request, "X-User-Id");
        if (!fromHeader.isBlank()) {
            return fromHeader;
        }
        Object attr = request.getAttribute("gatewayUserId");
        return attr != null ? String.valueOf(attr) : "anonymous";
    }

    private static String resolveUserGroup(HttpServletRequest request) {
        String fromHeader = header(request, "X-Permission-Group");
        if (!fromHeader.isBlank()) {
            return fromHeader;
        }
        Object attr = request.getAttribute("permissionGroupName");
        return attr != null ? String.valueOf(attr) : "";
    }

    private static String resolveClientId(HttpServletRequest request) {
        return header(request, "X-Client-Id");
    }

    private static String resolveChangeSummary(HttpServletRequest request) {
        List<String> parts = new ArrayList<>();
        String tokenUse = header(request, "X-Token-Use");
        if (!tokenUse.isBlank()) {
            parts.add("token_use=" + tokenUse);
        }
        String clientApp = header(request, "X-Client-App");
        if (!clientApp.isBlank()) {
            parts.add("client_app=" + clientApp);
        }
        return parts.isEmpty() ? "" : String.join(";", parts);
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = header(request, "X-Forwarded-For");
        if (!forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return comma > 0 ? forwarded.substring(0, comma).trim() : forwarded.trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    private static String header(HttpServletRequest request, String name) {
        String value = request.getHeader(name);
        return value == null ? "" : value.trim();
    }

    private static String env(String key, String defaultValue) {
        String v = System.getenv(key);
        return v == null || v.isBlank() ? defaultValue : v.trim();
    }
}
