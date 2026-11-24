package com.quickcode.module.platform.observability;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Nest {@code elastic-sink.ts} — best-effort fire-and-forget Elasticsearch POST. */
public final class ElasticSink {

    private static final Logger log = LoggerFactory.getLogger(ElasticSink.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpClient HTTP =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    private ElasticSink() {}

    public static String resolveElasticUri() {
        String raw =
                firstNonBlank(
                        System.getenv("ELASTIC_CONNECTION_STRING"),
                        System.getenv("Logging__ElasticConfiguration__Uri"),
                        "");
        if (raw.isBlank() || raw.contains("[{") || raw.contains("]")) {
            return null;
        }
        return raw.replaceAll("/+$", "");
    }

    public static void writeLog(Map<String, Object> document) {
        String base = resolveElasticUri();
        if (base == null) {
            return;
        }

        String apiName =
                slug(
                        firstNonBlank(
                                System.getenv("Logging__ApiName"),
                                System.getenv("MODULE_NAME"),
                                "quickcode-api"));
        String environment =
                slug(firstNonBlank(System.getenv("NODE_ENV"), "production")).replace('.', '-');
        String day = Instant.now().toString().substring(0, 10);
        String index = apiName + "--" + environment + "--" + day;
        String url = base + "/" + index + "/_doc";

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("@timestamp", Instant.now().toString());
        body.putAll(document);

        try {
            String json = JSON.writeValueAsString(body);
            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header("Content-Type", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(json))
                            .timeout(Duration.ofSeconds(10))
                            .build();
            HTTP.sendAsync(request, HttpResponse.BodyHandlers.discarding())
                    .exceptionally(
                            err -> {
                                log.warn("Elasticsearch write failed: {}", err.getMessage());
                                return null;
                            });
        } catch (Exception ex) {
            log.warn("Elasticsearch write failed: {}", ex.getMessage());
        }
    }

    private static String slug(String raw) {
        return raw.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9-]+", "-");
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return "";
    }
}
