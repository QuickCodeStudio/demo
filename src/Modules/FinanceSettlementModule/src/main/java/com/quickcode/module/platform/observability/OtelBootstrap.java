package com.quickcode.module.platform.observability;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.composite.CompositeMeterRegistry;
import io.micrometer.registry.otlp.OtlpConfig;
import io.micrometer.registry.otlp.OtlpMeterRegistry;
import java.net.URI;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Nest/Rust OTLP bootstrap parity — optional Micrometer OTLP push.
 * Alternative: attach OpenTelemetry Java agent at runtime (documented in application.yml).
 */
@Component
public class OtelBootstrap {

    private static final Logger log = LoggerFactory.getLogger(OtelBootstrap.class);

    public OtelBootstrap(MeterRegistry meterRegistry) {
        if ("1".equals(System.getenv("SWAGGER_DUMP"))) {
            return;
        }
        if (isDisabled()) {
            return;
        }
        if (!(meterRegistry instanceof CompositeMeterRegistry composite)) {
            return;
        }
        String endpoint =
                firstNonBlank(
                        System.getenv("Otlp__Endpoint"),
                        System.getenv("OTLP_ENDPOINT"),
                        System.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"),
                        "http://localhost:4317");
        String metricsUrl = toOtlpHttpMetricsUrl(endpoint);
        try {
            OtlpConfig config =
                    key ->
                            switch (key) {
                                case "otlp.url" -> metricsUrl;
                                case "otlp.step" -> Duration.ofSeconds(60).toString();
                                default -> null;
                            };
            composite.add(new OtlpMeterRegistry(config, io.micrometer.core.instrument.Clock.SYSTEM));
            log.info(
                    "Micrometer OTLP metrics export enabled ({}). Prometheus scrape: GET /metrics",
                    metricsUrl);
        } catch (Exception ex) {
            log.warn("OTLP metrics init failed ({}); GET /metrics still available", ex.getMessage());
        }
    }

    static boolean isDisabled() {
        String v = System.getenv("OTEL_ENABLED");
        if (v == null || v.isBlank()) {
            return false;
        }
        return switch (v.toLowerCase()) {
            case "false", "0", "no" -> true;
            default -> false;
        };
    }

    /** Rust/Nest trap: gRPC :4317 → OTLP HTTP :4318/v1/metrics. */
    public static String toOtlpHttpMetricsUrl(String endpoint) {
        String trimmed = endpoint.trim().replaceAll("/+$", "");
        if (trimmed.contains("/v1/metrics")) {
            return trimmed;
        }
        try {
            URI u = URI.create(trimmed);
            String host = u.getHost();
            int port = u.getPort();
            if (port == 4317 || (port < 0 && trimmed.contains(":4317"))) {
                return rebuild(u.getScheme(), host, 4318, "/v1/metrics");
            }
            String path = u.getPath();
            if (path == null || path.isEmpty() || "/".equals(path)) {
                return rebuild(u.getScheme(), host, port > 0 ? port : -1, "/v1/metrics");
            }
            if (!path.endsWith("/v1/metrics")) {
                return trimmed + "/v1/metrics";
            }
            return trimmed;
        } catch (Exception ex) {
            if (trimmed.contains(":4317") && !trimmed.contains(":4318")) {
                return trimmed.replace(":4317", ":4318") + "/v1/metrics";
            }
            return trimmed + "/v1/metrics";
        }
    }

    private static String rebuild(String scheme, String host, int port, String path) {
        if (scheme == null) {
            scheme = "http";
        }
        if (port > 0) {
            return scheme + "://" + host + ":" + port + path;
        }
        return scheme + "://" + host + path;
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
