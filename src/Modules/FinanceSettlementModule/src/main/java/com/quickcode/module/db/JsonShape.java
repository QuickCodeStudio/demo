package com.quickcode.module.db;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Map SQL column names → camelCase JSON keys (Nest/OpenAPI parity). */
public final class JsonShape {

    private JsonShape() {}

    public static String sqlKeyToCamel(String key) {
        boolean hasUnderscore = key.indexOf('_') >= 0;
        boolean allUpper = !key.isEmpty()
                && key.chars().filter(Character::isLetter).allMatch(Character::isUpperCase);

        if (hasUnderscore || allUpper) {
            String[] parts = key.split("_");
            StringBuilder out = new StringBuilder();
            for (int i = 0; i < parts.length; i++) {
                String part = parts[i];
                if (part.isEmpty()) {
                    continue;
                }
                if (i == 0) {
                    out.append(part.toLowerCase(Locale.ROOT));
                } else {
                    out.append(Character.toUpperCase(part.charAt(0)));
                    if (part.length() > 1) {
                        out.append(part.substring(1).toLowerCase(Locale.ROOT));
                    }
                }
            }
            return out.toString();
        }

        if (key.isEmpty()) {
            return key;
        }
        return Character.toLowerCase(key.charAt(0)) + key.substring(1);
    }

    public static Map<String, Object> rowToApi(Map<String, Object> row) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : row.entrySet()) {
            out.put(sqlKeyToCamel(e.getKey()), e.getValue());
        }
        return out;
    }

    public static List<Map<String, Object>> rowsToApi(List<Map<String, Object>> rows) {
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (Map<String, Object> row : rows) {
            out.add(rowToApi(row));
        }
        return out;
    }

    public static long scalarNumber(List<Map<String, Object>> rows) {
        if (rows.isEmpty()) {
            return 0;
        }
        Map<String, Object> row = rows.getFirst();
        if (row.size() == 1) {
            return valueAsLong(row.values().iterator().next());
        }
        return valueAsLong(row.values().stream().findFirst().orElse(0));
    }

    public static boolean scalarBool(List<Map<String, Object>> rows) {
        if (rows.isEmpty()) {
            return false;
        }
        Object v = rows.getFirst().values().stream().findFirst().orElse(false);
        return valueAsBool(v);
    }

    private static long valueAsLong(Object v) {
        if (v instanceof Number n) {
            return n.longValue();
        }
        if (v instanceof Boolean b) {
            return b ? 1 : 0;
        }
        if (v instanceof String s) {
            try {
                return Long.parseLong(s);
            } catch (NumberFormatException ignored) {
                return 0;
            }
        }
        return 0;
    }

    private static boolean valueAsBool(Object v) {
        if (v instanceof Boolean b) {
            return b;
        }
        if (v instanceof Number n) {
            return n.longValue() != 0;
        }
        if (v instanceof String s) {
            return "1".equals(s) || "true".equalsIgnoreCase(s) || "yes".equalsIgnoreCase(s);
        }
        return false;
    }
}
