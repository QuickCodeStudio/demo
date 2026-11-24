package com.quickcode.module.platform.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Nest / C# SensitivePayloadRedactor parity. */
public final class SensitivePayloadRedactor {

    public static final String SENSITIVE_PAYLOAD_MASK = "***";
    public static final String ADDITIONAL_FIELDS_ENV_VAR = "KAFKA_SENSITIVE_FIELDS";

    private static final ObjectMapper JSON = new ObjectMapper();

    private static final Set<String> EXACT_NAMES = new HashSet<>();

    static {
        for (String n :
                new String[] {
                    "password", "passwd", "passphrase", "parola", "şifre", "sifre", "oldpassword",
                    "newpassword", "confirmpassword", "currentpassword", "passwordhash",
                    "hashedpassword", "passwordconfirmation", "token", "accesstoken", "refreshtoken",
                    "idtoken", "bearertoken", "authtoken", "csrftoken", "sessiontoken", "secret",
                    "clientsecret", "appsecret", "apisecret", "apikey", "privatekey", "resetcode",
                    "resetpasswordcode", "twofactorcode", "twofactorrecoverycode", "otp", "pin",
                    "authorization", "cookie", "setcookie", "xapikey", "xauthtoken", "xaccesstoken"
                }) {
            EXACT_NAMES.add(n);
        }
    }

    private SensitivePayloadRedactor() {}

    public static String normalizeSensitiveName(String name) {
        if (name == null || name.isEmpty()) {
            return "";
        }
        StringBuilder out = new StringBuilder();
        for (char c : name.toCharArray()) {
            if (c == '_' || c == '-' || c == ' ') {
                continue;
            }
            out.append(Character.toLowerCase(c));
        }
        return out.toString();
    }

    public static boolean isSensitiveName(String name, List<String> additionalNames) {
        String n = normalizeSensitiveName(name);
        if (n.isEmpty()) {
            return false;
        }
        if (EXACT_NAMES.contains(n)) {
            return true;
        }
        if (additionalNames != null) {
            for (String extra : additionalNames) {
                if (n.equals(normalizeSensitiveName(extra))) {
                    return true;
                }
            }
        }
        for (String token : new String[] {"password", "passwd", "şifre", "sifre", "parola", "apikey"}) {
            if (n.contains(token)) {
                return true;
            }
        }
        for (String suffix : new String[] {"password", "token", "secret"}) {
            if (n.length() >= suffix.length() && n.endsWith(suffix)) {
                return true;
            }
        }
        return false;
    }

    public static List<String> additionalSensitiveNamesFromEnv() {
        String raw = System.getenv(ADDITIONAL_FIELDS_ENV_VAR);
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (String part : raw.split(",")) {
            String t = part.trim();
            if (!t.isEmpty()) {
                out.add(t);
            }
        }
        return out;
    }

    public static JsonNode redactSensitivePayload(JsonNode value) {
        List<String> extras = additionalSensitiveNamesFromEnv();
        if (value == null || value.isNull()) {
            return JSON.createObjectNode();
        }
        JsonNode clone = value.deepCopy();
        redactNode(clone, extras);
        return clone;
    }

    public static Map<String, String> redactSensitiveHeaders(Map<String, String> headers) {
        List<String> extras = additionalSensitiveNamesFromEnv();
        Map<String, String> result = new HashMap<>();
        if (headers == null) {
            return result;
        }
        for (Map.Entry<String, String> e : headers.entrySet()) {
            if (isSensitiveName(e.getKey(), extras)) {
                result.put(e.getKey(), SENSITIVE_PAYLOAD_MASK);
            } else {
                result.put(e.getKey(), e.getValue() == null ? "" : e.getValue());
            }
        }
        return result;
    }

    private static void redactNode(JsonNode node, List<String> extras) {
        if (node == null) {
            return;
        }
        if (node.isArray()) {
            ArrayNode arr = (ArrayNode) node;
            for (JsonNode child : arr) {
                redactNode(child, extras);
            }
            return;
        }
        if (!node.isObject()) {
            return;
        }
        ObjectNode obj = (ObjectNode) node;
        var fields = obj.fields();
        while (fields.hasNext()) {
            var entry = fields.next();
            if (isSensitiveName(entry.getKey(), extras)) {
                obj.put(entry.getKey(), SENSITIVE_PAYLOAD_MASK);
            } else {
                redactNode(entry.getValue(), extras);
            }
        }
    }

    public static JsonNode bytesToJson(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return JSON.createObjectNode();
        }
        try {
            JsonNode parsed = JSON.readTree(bytes);
            if (parsed.isObject()) {
                return parsed;
            }
            ObjectNode wrap = JSON.createObjectNode();
            wrap.set("return", parsed);
            return wrap;
        } catch (Exception ex) {
            ObjectNode err = JSON.createObjectNode();
            err.put("error", "Invalid JSON format");
            err.put("value", new String(bytes, java.nio.charset.StandardCharsets.UTF_8));
            return err;
        }
    }
}
