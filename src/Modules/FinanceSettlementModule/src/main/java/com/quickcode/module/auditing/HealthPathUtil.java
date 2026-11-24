package com.quickcode.module.auditing;

import java.util.Locale;

/** Nest / C# parity — skip audit & rate-limit noise on health probes. */
public final class HealthPathUtil {

    private HealthPathUtil() {}

    public static boolean isHealthPath(String path) {
        if (path == null || path.isBlank()) {
            return false;
        }
        String normalized = path.split("\\?", 2)[0].replaceAll("/+$", "");
        if (normalized.isEmpty()) {
            normalized = "/";
        }
        String lower = normalized.toLowerCase(Locale.ROOT);
        return lower.equals("/hc")
                || lower.equals("/health")
                || lower.equals("/metrics")
                || lower.endsWith("/hc")
                || lower.endsWith("/health")
                || lower.endsWith("/metrics");
    }
}
