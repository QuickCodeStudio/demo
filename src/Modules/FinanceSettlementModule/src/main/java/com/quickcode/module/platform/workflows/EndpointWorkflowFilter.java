package com.quickcode.module.platform.workflows;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Nest / C# {@code ModuleEndpointWorkflowMiddleware} parity (HTTP-step subset).
 * Matches method + path against the generated registry and returns the workflow output.
 * Registered right after {@link com.quickcode.module.platform.GatewayJwtFilter}.
 */
public class EndpointWorkflowFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(EndpointWorkflowFilter.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final int MAX_BODY_BYTES = 1024 * 1024;

    private final EndpointWorkflowRegistry registry;
    private final EndpointWorkflowExecutor executor;
    private final InMemoryIdempotencyStore idempotencyStore;

    public EndpointWorkflowFilter(EndpointWorkflowRegistry registry, EndpointWorkflowExecutor executor) {
        this(registry, executor, new InMemoryIdempotencyStore());
    }

    public EndpointWorkflowFilter(
            EndpointWorkflowRegistry registry,
            EndpointWorkflowExecutor executor,
            InMemoryIdempotencyStore idempotencyStore) {
        this.registry = registry;
        this.executor = executor;
        this.idempotencyStore = idempotencyStore == null ? new InMemoryIdempotencyStore() : idempotencyStore;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (shouldSkip(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        EndpointWorkflowRegistry.Match match = registry.find(request.getMethod(), path);
        if (match == null) {
            filterChain.doFilter(request, response);
            return;
        }

        EndpointWorkflowEntry entry = match.entry();
        String correlationId = resolveCorrelationId(request);
        response.setHeader("X-Correlation-Id", correlationId);

        String idempotencyKey = resolveIdempotencyKey(request, entry.name());
        if (idempotencyKey != null) {
            IdempotencyRecord cached = idempotencyStore.tryGet(idempotencyKey).orElse(null);
            if (cached != null) {
                response.setHeader("X-Idempotency-Replayed", "true");
                writeRaw(response, cached.statusCode(), cached.body());
                return;
            }
        }

        try {
            Map<String, Object> input = buildInput(request, match.pathParameters(), correlationId);
            EndpointWorkflowExecutor.Result result = executor.execute(entry, input, correlationId);

            if (!result.success()) {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("error", "Endpoint workflow failed");
                body.put("workflow", entry.name());
                body.put("correlationId", correlationId);
                body.put("sagaId", result.sagaId());
                body.put("compensatedSteps", result.compensatedSteps());
                body.put("steps", result.steps());
                writeAndCache(response, idempotencyKey, correlationId, 502, JSON.writeValueAsString(body));
                return;
            }
            writeAndCache(
                    response,
                    idempotencyKey,
                    correlationId,
                    200,
                    JSON.writeValueAsString(result.hasOutput() ? result.output() : result.steps()));
        } catch (Exception ex) {
            log.error(
                    "Endpoint workflow {} execution failed (correlation {})",
                    entry.name(),
                    correlationId,
                    ex);
            if (!response.isCommitted()) {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("error", "Endpoint workflow execution error");
                body.put("workflow", entry.name());
                body.put("correlationId", correlationId);
                writeJson(response, 500, body);
            }
        }
    }

    static boolean shouldSkip(String path) {
        if (path == null || path.isEmpty() || path.equals("/")) {
            return true;
        }
        String lower = path.toLowerCase(Locale.ROOT);
        return lower.startsWith("/hc")
                || lower.startsWith("/health")
                || lower.startsWith("/metrics")
                || lower.startsWith("/swagger")
                || lower.startsWith("/favicon");
    }

    private static String resolveCorrelationId(HttpServletRequest request) {
        String id = headerValue(request, "X-Correlation-Id");
        if (id == null) {
            id = headerValue(request, "X-Request-Id");
        }
        return id != null ? id : UUID.randomUUID().toString().replace("-", "");
    }

    private static String headerValue(HttpServletRequest request, String name) {
        String v = request.getHeader(name);
        return v == null || v.isBlank() ? null : v.trim();
    }

    private static Map<String, Object> buildInput(
            HttpServletRequest request, Map<String, String> pathParameters, String correlationId)
            throws IOException {
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("CorrelationId", correlationId);

        parseQuery(request.getQueryString(), root);
        pathParameters.forEach(
                (k, v) -> {
                    if (!k.isEmpty()) {
                        root.put(k, v);
                    }
                });

        String method = request.getMethod().toUpperCase(Locale.ROOT);
        if (method.equals("GET") || method.equals("HEAD") || method.equals("DELETE")) {
            return root;
        }

        String body = readBody(request);
        if (body == null || body.isBlank()) {
            return root;
        }
        try {
            JsonNode node = JSON.readTree(body);
            if (node != null && node.isObject()) {
                @SuppressWarnings("unchecked")
                Map<String, Object> obj = JSON.convertValue(node, LinkedHashMap.class);
                root.putAll(obj);
            } else {
                root.put("body", JSON.convertValue(node, Object.class));
            }
        } catch (IOException | IllegalArgumentException ex) {
            root.put("body", body);
        }
        return root;
    }

    /** Repeated keys are comma-joined (C# {@code StringValues.ToString()}). */
    private static void parseQuery(String query, Map<String, Object> root) {
        if (query == null || query.isEmpty()) {
            return;
        }
        for (String pair : query.split("&")) {
            if (pair.isEmpty()) {
                continue;
            }
            int eq = pair.indexOf('=');
            String key = decode(eq >= 0 ? pair.substring(0, eq) : pair);
            String value = eq >= 0 ? decode(pair.substring(eq + 1)) : "";
            if (key.isEmpty()) {
                continue;
            }
            Object existing = root.get(key);
            root.put(key, existing instanceof String s && !"CorrelationId".equals(key) ? s + "," + value : value);
        }
    }

    private static String decode(String raw) {
        try {
            return URLDecoder.decode(raw, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ex) {
            return raw;
        }
    }

    private static String readBody(HttpServletRequest request) throws IOException {
        try (InputStream in = request.getInputStream()) {
            byte[] bytes = in.readNBytes(MAX_BODY_BYTES + 1);
            if (bytes.length > MAX_BODY_BYTES) {
                throw new IOException("Request body too large");
            }
            return new String(bytes, StandardCharsets.UTF_8);
        }
    }

    /** Writes the response, then caches 200/502 outcomes when an idempotency key was supplied. */
    private void writeAndCache(
            HttpServletResponse response, String idempotencyKey, String correlationId, int status, String body)
            throws IOException {
        writeRaw(response, status, body);
        if (idempotencyKey != null) {
            idempotencyStore.save(new IdempotencyRecord(idempotencyKey, status, body, correlationId));
        }
    }

    /** {@code endpoint|{workflowName}|{raw}} from Idempotency-Key / X-Idempotency-Key (C# parity). */
    static String resolveIdempotencyKey(HttpServletRequest request, String workflowName) {
        String raw = headerValue(request, "Idempotency-Key");
        if (raw == null) {
            raw = headerValue(request, "X-Idempotency-Key");
        }
        return raw == null ? null : "endpoint|" + workflowName + "|" + raw;
    }

    private static void writeRaw(HttpServletResponse response, int status, String body) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(body);
    }

    private static void writeJson(HttpServletResponse response, int status, Object body) throws IOException {
        writeRaw(response, status, JSON.writeValueAsString(body));
    }
}
