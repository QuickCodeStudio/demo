package com.quickcode.module.platform;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Rust {@code cors.rs} allow-list + {@code *.domain} wildcard parity. */
public final class CorsOriginMatcher {

    private CorsOriginMatcher() {}

    public static List<String> parseOriginsList(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        String trimmed = raw.trim();
        if (trimmed.contains("*") && !trimmed.contains("*.")) {
            return List.of("*");
        }
        List<String> out = new ArrayList<>();
        for (String part : trimmed.split("[,;]")) {
            String s = part.trim();
            if (!s.isEmpty()) {
                out.add(s);
            }
        }
        return out;
    }

    public static boolean originMatches(String pattern, String origin) {
        if (pattern == null || origin == null) {
            return false;
        }
        if ("*".equals(pattern)) {
            return true;
        }
        if (pattern.equals(origin)) {
            return true;
        }
        if (pattern.startsWith("*.")) {
            String suffix = pattern.substring(2);
            String host = hostFromOrigin(origin);
            if (host == null) {
                return false;
            }
            return host.equals(suffix) || host.endsWith("." + suffix);
        }
        return false;
    }

    public static boolean anyOriginMatches(List<String> patterns, String origin) {
        if (patterns == null || patterns.isEmpty()) {
            return false;
        }
        if (patterns.size() == 1 && "*".equals(patterns.get(0))) {
            return true;
        }
        for (String p : patterns) {
            if (originMatches(p, origin)) {
                return true;
            }
        }
        return false;
    }

    static String hostFromOrigin(String origin) {
        int scheme = origin.indexOf("://");
        if (scheme < 0) {
            return null;
        }
        String rest = origin.substring(scheme + 3);
        int slash = rest.indexOf('/');
        String host = slash >= 0 ? rest.substring(0, slash) : rest;
        return host.toLowerCase(Locale.ROOT);
    }
}
