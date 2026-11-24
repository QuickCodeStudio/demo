package com.quickcode.module.platform.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.quickcode.module.auditing.HealthPathUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

public class KafkaPublishFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(KafkaPublishFilter.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    private final KafkaEventCatalogService catalog;
    private final KafkaProducerService producer;
    private final InMemoryOutboxStore outbox;

    /** Enqueues into the outbox; {@link OutboxDispatcher} drains it to Kafka (C# parity). */
    public KafkaPublishFilter(
            KafkaEventCatalogService catalog, KafkaProducerService producer, InMemoryOutboxStore outbox) {
        this.catalog = catalog;
        this.producer = producer;
        this.outbox = outbox;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (isExcludedPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        KafkaEventCatalogService.KafkaEventEntry hit =
                catalog.find(request.getMethod(), path);
        if (hit == null || !producer.isEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        ContentCachingRequestWrapper req = new ContentCachingRequestWrapper(request, 2 * 1024 * 1024);
        ContentCachingResponseWrapper res = new ContentCachingResponseWrapper(response);
        String correlationId = resolveCorrelationId(request);
        Map<String, String> reqHeaders = headerMap(req);
        long started = System.currentTimeMillis();

        try {
            filterChain.doFilter(req, res);
        } finally {
            int status = res.getStatus();
            if (status < 400) {
                publishSafe(req, res, hit, correlationId, reqHeaders, started);
            }
            res.copyBodyToResponse();
        }
    }

    private void publishSafe(
            ContentCachingRequestWrapper req,
            ContentCachingResponseWrapper res,
            KafkaEventCatalogService.KafkaEventEntry hit,
            String correlationId,
            Map<String, String> reqHeaders,
            long started) {
        try {
            JsonNode reqBody =
                    SensitivePayloadRedactor.redactSensitivePayload(
                            SensitivePayloadRedactor.bytesToJson(req.getContentAsByteArray()));
            JsonNode respBody =
                    SensitivePayloadRedactor.redactSensitivePayload(
                            SensitivePayloadRedactor.bytesToJson(res.getContentAsByteArray()));
            Map<String, String> respHeaders = headerMapFromResponse(res);

            ObjectNode envelope = JSON.createObjectNode();
            envelope.put("correlationId", correlationId);
            ObjectNode requestInfo = envelope.putObject("requestInfo");
            requestInfo.put("path", req.getRequestURI());
            requestInfo.put("method", req.getMethod());
            requestInfo.set("headers", JSON.valueToTree(SensitivePayloadRedactor.redactSensitiveHeaders(reqHeaders)));
            requestInfo.set("body", reqBody);
            ObjectNode responseInfo = envelope.putObject("responseInfo");
            responseInfo.put("statusCode", res.getStatus());
            responseInfo.set("headers", JSON.valueToTree(SensitivePayloadRedactor.redactSensitiveHeaders(respHeaders)));
            responseInfo.set("body", respBody);
            envelope.put("exceptionMessage", "");
            envelope.put("elapsedMilliseconds", System.currentTimeMillis() - started);
            envelope.put("timestamp", Instant.now().toString());

            String key = buildStableKey(req.getMethod(), req.getRequestURI(), correlationId, respBody);
            outbox.enqueue(new OutboxMessage(hit.topicName(), key, JSON.writeValueAsString(envelope), correlationId));
            log.info("Kafka outbox enqueued. Topic={} Key={} CorrelationId={}", hit.topicName(), key, correlationId);
        } catch (Exception ex) {
            log.error("Kafka outbox enqueue failed. Path={}", req.getRequestURI(), ex);
        }
    }

    private static String buildStableKey(String method, String path, String correlationId, JsonNode body) {
        JsonNode id = body.get("id");
        if (id == null || id.isNull()) {
            id = body.get("Id");
        }
        if (id != null && !id.isNull()) {
            String businessId = id.asText("");
            if (!businessId.isBlank()) {
                return method + "|" + path + "|" + businessId;
            }
        }
        return method + "|" + path + "|" + correlationId;
    }

    private static boolean isExcludedPath(String path) {
        if (path == null || path.isBlank()) {
            return true;
        }
        String p = path.toLowerCase(Locale.ROOT);
        return HealthPathUtil.isHealthPath(path)
                || p.startsWith("/swagger")
                || p.startsWith("/favicon")
                || p.contains("/kafka-events");
    }

    private static String resolveCorrelationId(HttpServletRequest request) {
        for (String name : new String[] {"x-correlation-id", "x-request-id"}) {
            String v = request.getHeader(name);
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return UUID.randomUUID().toString();
    }

    private static Map<String, String> headerMap(HttpServletRequest request) {
        Map<String, String> map = new HashMap<>();
        Enumeration<String> names = request.getHeaderNames();
        if (names == null) {
            return map;
        }
        while (names.hasMoreElements()) {
            String name = names.nextElement();
            map.put(name, request.getHeader(name));
        }
        return map;
    }

    private static Map<String, String> headerMapFromResponse(ContentCachingResponseWrapper res) {
        Map<String, String> map = new HashMap<>();
        for (String name : res.getHeaderNames()) {
            map.put(name, res.getHeader(name));
        }
        return map.isEmpty() ? Collections.emptyMap() : map;
    }
}
