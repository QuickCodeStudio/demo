package com.quickcode.module.db;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Pure helpers for InitialData JSON seeding (Nest parity). */
final class SeedSupport {

    static final ObjectMapper JSON = new ObjectMapper();

    private SeedSupport() {}

    static String contentHash(String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(content.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format(Locale.ROOT, "%02X", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    static String quoteIdent(String name, DbConfig.QuickCodeDbType dbType) {
        return switch (dbType) {
            case MSSQL -> "[" + name.replace("]", "]]") + "]";
            case MYSQL -> "`" + name.replace("`", "``") + "`";
            default -> "\"" + name.replace("\"", "\"\"") + "\"";
        };
    }

    static Map<String, Object> normalizeRow(Map<String, Object> row) {
        Map<String, Object> next = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : row.entrySet()) {
            if (e.getValue() != null) {
                next.put(e.getKey(), e.getValue());
            }
        }
        return next;
    }

    static String buildRowKey(Map<String, Object> row, List<String> columns) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < columns.size(); i++) {
            if (i > 0) {
                sb.append('|');
            }
            String col = columns.get(i);
            Object value = row.containsKey(col) ? row.get(col) : null;
            try {
                sb.append(col).append('=').append(JSON.writeValueAsString(value));
            } catch (JsonProcessingException ex) {
                throw new IllegalStateException(ex);
            }
        }
        return sb.toString();
    }

    static Map<String, List<Map<String, Object>>> parseSeedRoot(String content) throws JsonProcessingException {
        JsonNode root = JSON.readTree(content);
        if (root == null || !root.isObject()) {
            throw new JsonProcessingException("Seed JSON root must be an object") {};
        }
        Map<String, List<Map<String, Object>>> tables = new LinkedHashMap<>();
        root.fields().forEachRemaining(entry -> {
            String tableName = entry.getKey();
            JsonNode rowsNode = entry.getValue();
            if (rowsNode == null || !rowsNode.isArray() || rowsNode.isEmpty()) {
                return;
            }
            List<Map<String, Object>> rows = new ArrayList<>();
            for (JsonNode rowNode : rowsNode) {
                if (rowNode == null || !rowNode.isObject()) {
                    continue;
                }
                Map<String, Object> row =
                        JSON.convertValue(
                                rowNode,
                                JSON.getTypeFactory().constructMapType(LinkedHashMap.class, String.class, Object.class));
                rows.add(row);
            }
            if (!rows.isEmpty()) {
                tables.put(tableName, rows);
            }
        });
        return tables;
    }
}
