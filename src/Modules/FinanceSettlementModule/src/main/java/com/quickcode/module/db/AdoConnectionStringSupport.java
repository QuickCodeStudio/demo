package com.quickcode.module.db;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Cloud Run module workflows inject C# ADO.NET READ/WRITE_CONNECTION_STRING.
 * Java expects DB_* — hydrate System properties before Spring binds application.yml.
 */
public final class AdoConnectionStringSupport {

    private AdoConnectionStringSupport() {}

    public static void applyConnectionStringEnvFallback() {
        if (nonEmpty(System.getenv("DB_HOST")) || nonEmpty(System.getProperty("DB_HOST"))) {
            return;
        }
        String raw = firstNonBlank(
                System.getenv("READ_CONNECTION_STRING"),
                System.getenv("WRITE_CONNECTION_STRING"));
        if (raw == null) {
            return;
        }

        Map<String, String> map = parseAdoStyle(raw);
        String hostRaw = first(map, "data source", "server", "host", "addr", "address");
        if (hostRaw == null) {
            return;
        }

        HostPort hp = splitHostPort(hostRaw);
        set("DB_HOST", hp.host);

        String catalog = first(map, "initial catalog", "database", "db");
        if (catalog != null) {
            set("DB_DATABASE", catalog);
        }
        String user = first(map, "user id", "uid", "username", "user");
        if (user != null) {
            set("DB_USERNAME", user);
        }
        String password = first(map, "password", "pwd");
        if (password != null) {
            set("DB_PASSWORD", password);
        }

        String port = first(map, "port");
        if (port == null) {
            port = hp.port;
        }
        if (port == null && looksLikeMssql(map)) {
            port = "1433";
        }
        if (port != null) {
            set("DB_PORT", port);
        }

        if (!nonEmpty(System.getenv("DB_TYPE")) && !nonEmpty(System.getProperty("DB_TYPE"))) {
            if (looksLikeMssql(map)) {
                set("DB_TYPE", "mssql");
            } else if (map.containsKey("uid") || map.containsKey("pwd") || map.containsKey("server")) {
                set("DB_TYPE", "mysql");
            } else if (map.containsKey("host") || map.containsKey("username")) {
                set("DB_TYPE", "postgresql");
            }
        }
    }

    private static void set(String key, String value) {
        System.setProperty(key, value);
    }

    private static boolean nonEmpty(String v) {
        return v != null && !v.isBlank();
    }

    private static String firstNonBlank(String a, String b) {
        if (nonEmpty(a)) {
            return a.trim();
        }
        if (nonEmpty(b)) {
            return b.trim();
        }
        return null;
    }

    private static Map<String, String> parseAdoStyle(String raw) {
        Map<String, String> map = new HashMap<>();
        for (String part : raw.split(";")) {
            int idx = part.indexOf('=');
            if (idx <= 0) {
                continue;
            }
            String key = part.substring(0, idx).trim().toLowerCase(Locale.ROOT);
            String value = part.substring(idx + 1).trim();
            if (!key.isEmpty()) {
                map.put(key, value);
            }
        }
        return map;
    }

    private static String first(Map<String, String> map, String... keys) {
        for (String key : keys) {
            String v = map.get(key);
            if (nonEmpty(v)) {
                return v;
            }
        }
        return null;
    }

    private static boolean looksLikeMssql(Map<String, String> map) {
        return map.containsKey("data source")
                || map.containsKey("initial catalog")
                || map.containsKey("user id");
    }

    private static HostPort splitHostPort(String host) {
        String h = host.trim();
        if (h.toLowerCase(Locale.ROOT).startsWith("tcp:")) {
            h = h.substring(4);
        }
        int comma = h.lastIndexOf(',');
        if (comma > 0) {
            String maybePort = h.substring(comma + 1).trim();
            if (maybePort.chars().allMatch(Character::isDigit)) {
                return new HostPort(h.substring(0, comma).trim(), maybePort);
            }
        }
        int colon = h.lastIndexOf(':');
        if (colon > 0 && h.indexOf(':') == colon) {
            String maybePort = h.substring(colon + 1).trim();
            if (maybePort.chars().allMatch(Character::isDigit)) {
                return new HostPort(h.substring(0, colon).trim(), maybePort);
            }
        }
        return new HostPort(h, null);
    }

    private record HostPort(String host, String port) {}
}
