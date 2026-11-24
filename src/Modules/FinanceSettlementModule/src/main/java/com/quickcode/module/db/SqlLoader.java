package com.quickcode.module.db;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class SqlLoader {

    private static final Pattern NAMED_PARAM = Pattern.compile("@([A-Za-z_][A-Za-z0-9_]*)");

    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public String loadSql(String className, String kind, String scriptName) {
        String key = className + "/" + kind + "/" + scriptName;
        return cache.computeIfAbsent(key, k -> readScript(className, kind, scriptName));
    }

    private static String readScript(String className, String kind, String scriptName) {
        String fileName = className + "." + scriptName + ".g.sql";
        Path full = resolveSqlRoot().resolve(className).resolve(kind).resolve(fileName);
        if (!Files.isRegularFile(full)) {
            throw new IllegalStateException("QuickCode SQL script not found: " + full);
        }
        try {
            return stripBom(Files.readString(full, StandardCharsets.UTF_8));
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read SQL script: " + full, ex);
        }
    }

    public static Path resolveSqlRoot() {
        String explicit = System.getenv("QUICKCODE_SQL_ROOT");
        if (explicit != null && !explicit.isBlank()) {
            return Path.of(explicit);
        }
        for (Path candidate : new Path[] {Path.of("sql"), Path.of("/app/sql")}) {
            if (Files.isDirectory(candidate)) {
                return candidate;
            }
        }
        return Path.of("sql");
    }

    public static Path resolveMigrationsRoot() {
        String explicit = System.getenv("QUICKCODE_MIGRATIONS_DIR");
        if (explicit != null && !explicit.isBlank()) {
            return Path.of(explicit);
        }
        for (Path candidate : new Path[] {Path.of("migrations"), Path.of("/app/migrations")}) {
            if (Files.isDirectory(candidate)) {
                return candidate;
            }
        }
        return Path.of("migrations");
    }

    /** Bind @Named parameters (Dapper / @PRM_* parity) to dialect placeholders. */
    public BoundSql bindNamedParams(String sql, Map<String, ?> named, DbConfig.QuickCodeDbType dbType) {
        StringBuilder out = new StringBuilder();
        java.util.List<Object> params = new java.util.ArrayList<>();
        Matcher m = NAMED_PARAM.matcher(sql);
        int last = 0;
        while (m.find()) {
            out.append(sql, last, m.start());
            String name = m.group(1);
            if (name.chars().allMatch(Character::isDigit)) {
                out.append(m.group());
            } else {
                params.add(lookupNamed(named, name));
                out.append(dialectPlaceholder(dbType, params.size()));
            }
            last = m.end();
        }
        out.append(sql.substring(last));
        return new BoundSql(out.toString(), params);
    }

    private static Object lookupNamed(Map<String, ?> named, String token) {
        if (named.containsKey(token)) {
            return named.get(token);
        }
        String at = "@" + token;
        if (named.containsKey(at)) {
            return named.get(at);
        }
        String upper = token.toUpperCase(Locale.ROOT);
        for (Map.Entry<String, ?> e : named.entrySet()) {
            String bare = e.getKey().startsWith("@") ? e.getKey().substring(1) : e.getKey();
            if (bare.toUpperCase(Locale.ROOT).equals(upper)) {
                return e.getValue();
            }
        }
        return null;
    }

    private static String dialectPlaceholder(DbConfig.QuickCodeDbType dbType, int index) {
        return switch (dbType) {
            case POSTGRESQL -> "$" + index;
            case MYSQL -> "?";
            case MSSQL -> "?";
            default -> "?";
        };
    }

    public static String stripBom(String text) {
        if (!text.isEmpty() && text.charAt(0) == '\uFEFF') {
            return text.substring(1);
        }
        return text;
    }

    public record BoundSql(String text, java.util.List<Object> params) {}
}
