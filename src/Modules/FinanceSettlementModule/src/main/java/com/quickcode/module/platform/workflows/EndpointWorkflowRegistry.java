package com.quickcode.module.platform.workflows;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * In-process index of generated endpoint workflows (method + path → YAML).
 * Nest / C# {@code ModuleEndpointWorkflowRegistry} + {@code EndpointWorkflowIndex} parity.
 */
public class EndpointWorkflowRegistry {

    public static final String DEFAULT_PATH = "workflows/generated-endpoint-workflows.json";

    private static final Logger log = LoggerFactory.getLogger(EndpointWorkflowRegistry.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    /** {id}, {id:int}, {id?}, {*id} */
    private static final Pattern PARAM_SEGMENT =
            Pattern.compile("^\\{\\*?([A-Za-z_]\\w*)(?::[^}?]*)?(\\?)?\\}$");

    public record Match(EndpointWorkflowEntry entry, Map<String, String> pathParameters) {}

    private record TemplateRoute(Pattern regex, List<String> names, EndpointWorkflowEntry entry) {}

    private static final class MethodBucket {
        final Map<String, EndpointWorkflowEntry> exact = new HashMap<>();
        final List<TemplateRoute> templates = new ArrayList<>();
    }

    private volatile Map<String, MethodBucket> byMethod = Map.of();
    private volatile int count;

    /** Loads from {@code ENDPOINT_WORKFLOWS_PATH} or {@code <cwd>/workflows/generated-endpoint-workflows.json}. */
    public static EndpointWorkflowRegistry fromEnvironment() {
        EndpointWorkflowRegistry registry = new EndpointWorkflowRegistry();
        registry.loadFromFile(resolveDefaultPath());
        return registry;
    }

    static Path resolveDefaultPath() {
        String configured = System.getenv("ENDPOINT_WORKFLOWS_PATH");
        if (configured != null && !configured.isBlank()) {
            return Path.of(configured.trim()).toAbsolutePath();
        }
        return Path.of(System.getProperty("user.dir"), DEFAULT_PATH).toAbsolutePath();
    }

    public int size() {
        return count;
    }

    public void loadFromFile(Path target) {
        if (!Files.isRegularFile(target)) {
            register(List.of());
            return;
        }
        try {
            String raw = Files.readString(target, StandardCharsets.UTF_8).trim();
            register(raw.isEmpty() ? List.of() : parseEntries(raw));
            log.info("Loaded {} endpoint workflow(s) from {}", count, target);
        } catch (IOException | RuntimeException ex) {
            log.error("Failed to load endpoint workflows from {}: {}", target, ex.getMessage());
            register(List.of());
        }
    }

    static List<EndpointWorkflowEntry> parseEntries(String json) throws IOException {
        JsonNode root = JSON.readTree(json);
        List<EndpointWorkflowEntry> entries = new ArrayList<>();
        if (root == null || !root.isArray()) {
            return entries;
        }
        for (JsonNode n : root) {
            entries.add(
                    new EndpointWorkflowEntry(
                            text(n, "name"),
                            text(n, "moduleName"),
                            text(n, "endpointPath"),
                            text(n, "httpMethod"),
                            text(n, "description"),
                            text(n, "workflowContent"),
                            n.path("isActive").asBoolean(false)));
        }
        return entries;
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }

    /** Rebuilds the index; inactive / incomplete entries are skipped (C# {@code EndpointWorkflowIndex.From}). */
    public void register(List<EndpointWorkflowEntry> entries) {
        Map<String, MethodBucket> index = new HashMap<>();
        int total = 0;
        for (EndpointWorkflowEntry entry : entries == null ? List.<EndpointWorkflowEntry>of() : entries) {
            if (entry == null
                    || !entry.isActive()
                    || isBlank(entry.endpointPath())
                    || isBlank(entry.httpMethod())
                    || isBlank(entry.workflowContent())) {
                continue;
            }
            String method = entry.httpMethod().trim().toUpperCase(Locale.ROOT);
            MethodBucket bucket = index.computeIfAbsent(method, k -> new MethodBucket());
            if (entry.endpointPath().contains("{")) {
                CompiledTemplate compiled = compileTemplate(entry.endpointPath());
                bucket.templates.add(new TemplateRoute(compiled.regex, compiled.names, entry));
            } else {
                bucket.exact.put(normalizePath(entry.endpointPath()).toLowerCase(Locale.ROOT), entry);
            }
            total++;
        }
        this.byMethod = index;
        this.count = total;
    }

    public Match find(String httpMethod, String path) {
        if (isBlank(path) || isBlank(httpMethod)) {
            return null;
        }
        MethodBucket bucket = byMethod.get(httpMethod.toUpperCase(Locale.ROOT));
        if (bucket == null) {
            return null;
        }
        String normalized = normalizePath(path);
        EndpointWorkflowEntry exact = bucket.exact.get(normalized.toLowerCase(Locale.ROOT));
        if (exact != null) {
            return new Match(exact, Map.of());
        }
        for (TemplateRoute route : bucket.templates) {
            Matcher m = route.regex().matcher(normalized);
            if (!m.matches()) {
                continue;
            }
            Map<String, String> parameters = new LinkedHashMap<>();
            for (int i = 0; i < route.names().size(); i++) {
                String value = m.group(i + 1);
                if (value != null) {
                    parameters.put(route.names().get(i), safeDecode(value));
                }
            }
            return new Match(route.entry(), parameters);
        }
        return null;
    }

    /** Query-less, single leading slash, no trailing slash (root stays {@code /}). */
    static String normalizePath(String path) {
        String noQuery = path.split("\\?", 2)[0].trim();
        String trimmed = noQuery.replaceAll("^/+|/+$", "");
        return "/" + trimmed;
    }

    private record CompiledTemplate(Pattern regex, List<String> names) {}

    /** {@code /api/orders/{id}} → regex + param names. Supports {@code {id?}} (do not strip {@code ?}). */
    private static CompiledTemplate compileTemplate(String template) {
        List<String> names = new ArrayList<>();
        StringBuilder regex = new StringBuilder();
        // Do not use normalizePath: splitting on `?` would eat `{id?}`.
        String trimmed = template == null ? "" : template.trim().replaceAll("^/+|/+$", "");
        for (String segment : trimmed.split("/")) {
            if (segment.isEmpty()) {
                continue;
            }
            Matcher m = PARAM_SEGMENT.matcher(segment);
            if (m.matches()) {
                names.add(m.group(1));
                regex.append(m.group(2) != null ? "(?:/([^/]+))?" : "/([^/]+)");
            } else {
                regex.append('/').append(Pattern.quote(segment));
            }
        }
        return new CompiledTemplate(
                Pattern.compile("^" + regex + "/?$", Pattern.CASE_INSENSITIVE), names);
    }

    private static String safeDecode(String value) {
        try {
            // URLDecoder maps '+' to space; path segments keep '+' literal.
            return URLDecoder.decode(value.replace("+", "%2B"), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ex) {
            return value;
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
