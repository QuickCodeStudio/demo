package com.quickcode.module.platform.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickcode.module.platform.http.GatewayServiceTokenGenerator;
import com.quickcode.module.platform.http.HttpFetchWithRetry;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class KafkaEventCatalogService {

    private static final Logger log = LoggerFactory.getLogger(KafkaEventCatalogService.class);
    private static final Duration TTL = Duration.ofMinutes(5);
    private static final ObjectMapper JSON = new ObjectMapper();

    private final GatewayServiceTokenGenerator tokenGenerator;
    private final HttpClient httpClient = HttpFetchWithRetry.defaultClient();
    private volatile CacheEntry cache;

    public KafkaEventCatalogService(GatewayServiceTokenGenerator tokenGenerator) {
        this.tokenGenerator = tokenGenerator;
    }

    public KafkaEventEntry find(String httpMethod, String path) {
        if (path == null || path.isBlank()) {
            return null;
        }
        List<KafkaEventEntry> entries = getEntries();
        String method = httpMethod.toUpperCase(Locale.ROOT);
        for (String candidate : pathVariants(path)) {
            for (KafkaEventEntry e : entries) {
                if (!e.isActive()) {
                    continue;
                }
                if (!e.httpMethod().equalsIgnoreCase(method)) {
                    continue;
                }
                if (pathMatches(e.urlPath(), candidate)) {
                    return new KafkaEventEntry(
                            e.topicName() + "_" + method.toLowerCase(Locale.ROOT),
                            e.urlPath(),
                            e.httpMethod(),
                            true);
                }
            }
        }
        return null;
    }

    private List<KafkaEventEntry> getEntries() {
        CacheEntry local = cache;
        if (local != null && Instant.now().isBefore(local.expiresAt())) {
            return local.entries();
        }
        try {
            List<KafkaEventEntry> loaded = loadEvents();
            cache = new CacheEntry(Instant.now().plus(TTL), loaded);
            return loaded;
        } catch (Exception ex) {
            log.error("Failed to load Kafka event catalog", ex);
            return List.of();
        }
    }

    private List<KafkaEventEntry> loadEvents() throws Exception {
        String baseUrl =
                firstNonBlank(
                        System.getenv("IDENTITY_MODULE_API"),
                        System.getenv("QuickcodeClients__IdentityModuleApi"),
                        null);
        if (baseUrl == null) {
            log.warn(
                    "IDENTITY_MODULE_API / QuickcodeClients__IdentityModuleApi not configured; Kafka catalog is empty");
            return List.of();
        }
        String token = resolveCatalogBearerToken();
        if (token == null) {
            log.warn(
                    "Kafka catalog auth missing: set GATEWAY_JWT_PRIVATE_KEY or GATEWAY_SERVICE_BEARER / IDENTITY_SERVICE_BEARER");
            return List.of();
        }
        String url = combine(baseUrl, "api/identity-module/kafka-events/get-kafka-events");
        HttpRequest request =
                HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Authorization", "Bearer " + token)
                        .GET()
                        .timeout(Duration.ofSeconds(30))
                        .build();
        HttpResponse<String> response =
                HttpFetchWithRetry.sendWithRetry(httpClient, request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new IllegalStateException("Kafka catalog HTTP " + response.statusCode());
        }
        JsonNode raw = JSON.readTree(response.body());
        if (!raw.isArray()) {
            return List.of();
        }
        List<KafkaEventEntry> out = new ArrayList<>();
        for (JsonNode x : raw) {
            out.add(
                    new KafkaEventEntry(
                            text(x, "topicName", "TopicName"),
                            text(x, "urlPath", "UrlPath"),
                            text(x, "httpMethod", "HttpMethod"),
                            x.path("isActive").asBoolean(x.path("IsActive").asBoolean(false))));
        }
        return out;
    }

    private String resolveCatalogBearerToken() {
        String minted = tokenGenerator.mint("IdentityModule");
        if (minted != null && !minted.isBlank()) {
            return minted;
        }
        return firstNonBlank(
                System.getenv("GATEWAY_SERVICE_BEARER"),
                System.getenv("IDENTITY_SERVICE_BEARER"),
                null);
    }

    private static String text(JsonNode node, String camel, String pascal) {
        if (node.hasNonNull(camel)) {
            return node.get(camel).asText();
        }
        if (node.hasNonNull(pascal)) {
            return node.get(pascal).asText();
        }
        return "";
    }

    private static String combine(String baseUrl, String path) {
        return baseUrl.replaceAll("/+$", "") + "/" + path.replaceAll("^/+", "");
    }

    private static List<String> pathVariants(String path) {
        List<String> out = new ArrayList<>();
        out.add(path);
        String trimmed = path.replaceAll("/+$", "");
        if (!trimmed.isEmpty() && !trimmed.equals(path)) {
            out.add(trimmed);
        }
        if (path.startsWith("/")) {
            out.add(path.substring(1));
        } else {
            out.add("/" + path);
        }
        return out;
    }

    static boolean pathMatches(String template, String path) {
        String t = template.replaceAll("/+$", "").toLowerCase(Locale.ROOT);
        String p = path.replaceAll("/+$", "").toLowerCase(Locale.ROOT);
        if (t.equals(p)) {
            return true;
        }
        String[] tParts = t.split("/");
        String[] pParts = p.split("/");
        List<String> tList = new ArrayList<>();
        List<String> pList = new ArrayList<>();
        for (String s : tParts) {
            if (!s.isEmpty()) tList.add(s);
        }
        for (String s : pParts) {
            if (!s.isEmpty()) pList.add(s);
        }
        if (tList.size() != pList.size()) {
            return false;
        }
        for (int i = 0; i < tList.size(); i++) {
            String tp = tList.get(i);
            if (tp.startsWith("{") && tp.endsWith("}")) {
                continue;
            }
            if (!tp.equals(pList.get(i))) {
                return false;
            }
        }
        return true;
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }

    public record KafkaEventEntry(String topicName, String urlPath, String httpMethod, boolean isActive) {}

    private record CacheEntry(Instant expiresAt, List<KafkaEventEntry> entries) {}
}
