package com.quickcode.module.platform.workflows;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReferenceArray;
import java.util.function.BooleanSupplier;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;

/**
 * C# {@code WorkflowExecutor} parity for {@code kind: endpoint}: HTTP steps, transitions,
 * {@code {{tokens}}}, output projection, {@code parallel} (join all|any|failFast), {@code foreach}
 * (sequential|parallel), {@code compensate} (LIFO saga rollback), {@code repeat} (exponential
 * backoff) and an in-memory saga store.
 */
public class EndpointWorkflowExecutor {

    private static final Logger log = LoggerFactory.getLogger(EndpointWorkflowExecutor.class);
    private static final ObjectMapper JSON =
            new ObjectMapper().enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
    private static final Pattern TOKEN = Pattern.compile("\\{\\{(.*?)}}");
    private static final Pattern CONDITION =
            Pattern.compile("(\\w+(?:\\.\\w+)*)\\s*(==|!=|>=|<=|>|<)\\s*(.+)");
    private static final Pattern BOOL = Pattern.compile("^(true|false)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern INT = Pattern.compile("^-?\\d{1,15}$");
    private static final Pattern DECIMAL = Pattern.compile("^-?\\d*\\.\\d+(?:[eE][+-]?\\d+)?$");
    private static final Set<String> RESTRICTED_HEADERS =
            Set.of("host", "content-length", "connection", "expect", "upgrade");
    private static final Pattern FOREACH_TOKEN = Pattern.compile("^\\{\\{\\s*(.+?)\\s*}}$");
    static final int MAX_PARALLEL_BRANCHES = 8;
    static final int MAX_FOREACH_ITEMS = 100;
    private static final int MAX_STEP_VISITS = 100;
    private static final BooleanSupplier NOT_CANCELLED = () -> false;
    private static final int DEFAULT_TIMEOUT_SECONDS = 30;

    /** Outbound HTTP seam (overridable in tests). */
    @FunctionalInterface
    public interface HttpTransport {
        Response send(String method, String url, Map<String, String> headers, String body, Duration timeout)
                throws Exception;

        record Response(int statusCode, String body) {}
    }

    public record Result(
            boolean success,
            boolean hasOutput,
            Object output,
            Map<String, Object> steps,
            String sagaId,
            List<String> compensatedSteps) {}

    private final Function<String, String> tokenMinter;
    private final HttpTransport transport;
    private final Function<String, String> envLookup;
    private final InMemorySagaStateStore sagaStore;

    public EndpointWorkflowExecutor(Function<String, String> tokenMinter) {
        this(tokenMinter, defaultTransport(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build()));
    }

    public EndpointWorkflowExecutor(Function<String, String> tokenMinter, HttpTransport transport) {
        this(tokenMinter, transport, System::getenv);
    }

    public EndpointWorkflowExecutor(
            Function<String, String> tokenMinter, HttpTransport transport, Function<String, String> envLookup) {
        this(tokenMinter, transport, envLookup, new InMemorySagaStateStore());
    }

    public EndpointWorkflowExecutor(
            Function<String, String> tokenMinter,
            HttpTransport transport,
            Function<String, String> envLookup,
            InMemorySagaStateStore sagaStore) {
        this.tokenMinter = tokenMinter;
        this.transport = transport;
        this.envLookup = envLookup;
        this.sagaStore = sagaStore == null ? new InMemorySagaStateStore() : sagaStore;
    }

    public InMemorySagaStateStore sagaStore() {
        return sagaStore;
    }

    @SuppressWarnings("unchecked")
    public Result execute(EndpointWorkflowEntry entry, Map<String, Object> input, String correlationId) {
        Object parsed = new Yaml(new SafeConstructor(new LoaderOptions())).load(entry.workflowContent());
        Map<String, Object> workflow =
                parsed instanceof Map<?, ?> m ? (Map<String, Object>) m : new LinkedHashMap<>();
        return new Run(workflow, input, correlationId).execute();
    }

    private static HttpTransport defaultTransport(HttpClient client) {
        return (method, url, headers, body, timeout) -> {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url)).timeout(timeout);
            headers.forEach(
                    (k, v) -> {
                        if (!RESTRICTED_HEADERS.contains(k.toLowerCase(Locale.ROOT))) {
                            builder.header(k, v);
                        }
                    });
            builder.method(
                    method,
                    body == null
                            ? HttpRequest.BodyPublishers.noBody()
                            : HttpRequest.BodyPublishers.ofString(body));
            HttpResponse<String> res = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            return new HttpTransport.Response(res.statusCode(), res.body());
        };
    }

    private final class Run {
        private final Map<String, Object> workflow;
        private final Map<String, Object> input;
        private final String correlationId;
        private final String sagaId = UUID.randomUUID().toString().replace("-", "");
        private final Map<String, Object> results = Collections.synchronizedMap(new LinkedHashMap<>());
        private final Map<String, Object> variables = new ConcurrentHashMap<>();
        private final Map<String, Object> itemScopes = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        private final Deque<String[]> compensationStack = new ArrayDeque<>();
        private volatile boolean compensationsRan;
        private volatile List<String> compensatedSteps = List.of();

        Run(Map<String, Object> workflow, Map<String, Object> input, String correlationId) {
            this.workflow = workflow;
            this.input = input == null ? Map.of() : input;
            this.correlationId = correlationId;
        }

        Result execute() {
            String workflowName = str(workflow.get("name"));
            Object kind = workflow.get("kind");
            log.info(
                    "Starting workflow: {} SagaId={} CorrelationId={}", workflowName, sagaId, correlationId);
            initializeVariables();
            compensationsRan = false;
            synchronized (compensationStack) {
                compensationStack.clear();
            }

            sagaStore.start(
                    new SagaStateRecord(
                            sagaId,
                            workflowName,
                            kind == null ? "endpoint" : String.valueOf(kind),
                            correlationId));

            Map<String, Object> steps = map(workflow.get("steps"));
            boolean success = true;
            if (steps.isEmpty()) {
                log.warn("Workflow {} has no steps", workflowName);
                sagaStore.complete(sagaId, SagaStatus.Completed);
            } else {
                success = executeStep(steps.keySet().iterator().next(), 0);
                if (!success) {
                    runCompensations("workflow failed");
                }
                SagaStatus status =
                        success
                                ? SagaStatus.Completed
                                : !compensatedSteps.isEmpty() ? SagaStatus.Compensated : SagaStatus.Failed;
                sagaStore.complete(sagaId, status, success ? null : "workflow failed");
            }

            boolean isEndpoint = kind == null || "endpoint".equalsIgnoreCase(String.valueOf(kind));
            Object output = workflow.get("output");
            boolean hasOutput = isEndpoint && output instanceof Map<?, ?> m && !m.isEmpty();

            log.info(
                    "Workflow {} completed. Success={} Compensated={}",
                    workflowName,
                    success,
                    compensatedSteps.size());
            Map<String, Object> snapshot;
            synchronized (results) {
                snapshot = new LinkedHashMap<>(results);
            }
            return new Result(
                    success,
                    hasOutput,
                    hasOutput && success ? resolveOutput(output) : null,
                    snapshot,
                    sagaId,
                    List.copyOf(compensatedSteps));
        }

        // ── steps ──────────────────────────────────────────────────────────

        private boolean executeStep(String stepName, int visits) {
            if (visits >= MAX_STEP_VISITS) {
                log.warn("Workflow exceeded {} step transitions (loop?) at {}", MAX_STEP_VISITS, stepName);
                return false;
            }
            Map<String, Object> allSteps = map(workflow.get("steps"));
            if (!allSteps.containsKey(stepName)) {
                log.warn("Step {} not found", stepName);
                return false;
            }
            return executeStep(stepName, map(allSteps.get(stepName)), visits);
        }

        /** Order: condition → dependsOn → repeat → parallel → foreach → virtual → http. */
        private boolean executeStep(String stepName, Map<String, Object> step, int visits) {
            log.info("Executing step: {}", stepName);

            String condition = str(step.get("condition"));
            if (condition != null && !condition.isBlank() && !evaluateCondition(condition, null)) {
                log.info("Skipping step {} due to condition", stepName);
                return true;
            }

            if (step.get("dependsOn") instanceof List<?> deps) {
                for (Object dep : deps) {
                    if (!results.containsKey(dep + ".response")) {
                        log.warn("Dependencies not met for step {}", stepName);
                        return false;
                    }
                }
            }

            String repeat = str(step.get("repeat"));
            if (repeat != null && !repeat.isBlank()) {
                return executeRepeat(stepName, step, repeat, visits);
            }

            List<String> parallel = parallelChildren(step);
            if (!parallel.isEmpty()) {
                boolean joined = runNamedHttpSteps(parallel, str(step.get("join")));
                storeCoordinatorResult(stepName, joined);
                return followCoordinatorTransitions(stepName, step, coordinatorResult(joined), joined, visits);
            }

            String foreach = foreachExpression(step);
            if (foreach != null) {
                return executeForeach(stepName, step, visits);
            }

            // Virtual / transition-only step (no URL), e.g. routing hubs.
            String url = str(step.get("url"));
            if (url == null || url.isBlank()) {
                Map<String, Object> ok = coordinatorResult(true);
                results.put(stepName + ".statusCode", 200);
                results.put(stepName + ".response", ok);
                Boolean branched = followTransitions(stepName, step, ok, visits);
                return branched == null || branched;
            }
            return executeHttpStep(stepName, step, visits, true, NOT_CANCELLED, null, null, null);
        }

        // ── repeat ─────────────────────────────────────────────────────────

        private boolean executeRepeat(String stepName, Map<String, Object> step, String repeat, int visits) {
            int maxRetries;
            try {
                maxRetries = Integer.parseInt(replaceTokens(repeat).trim());
            } catch (NumberFormatException ex) {
                log.warn("Step {} has invalid repeat expression '{}'", stepName, repeat);
                return false;
            }
            Map<String, Object> clone = new LinkedHashMap<>(step);
            clone.remove("repeat");

            int currentRetry = 0;
            boolean success = false;
            while (!success && currentRetry < maxRetries) {
                variables.put("currentRetryCount", currentRetry);
                try {
                    success = executeStep(stepName, clone, visits);
                } catch (RuntimeException ex) {
                    log.warn("Step {} failed on attempt {}: {}", stepName, currentRetry + 1, ex.getMessage());
                    success = false;
                }
                if (!success) {
                    long delay = backoffDelayMillis(currentRetry);
                    try {
                        Thread.sleep(delay);
                    } catch (InterruptedException ex) {
                        Thread.currentThread().interrupt();
                        return false;
                    }
                    currentRetry++;
                }
            }
            return success;
        }

        private long backoffDelayMillis(int retryAttempt) {
            int baseDelay = intVariable("retryBaseDelayMs", 1000);
            int maxDelay = intVariable("maxRetryDelayMs", 30000);
            double exponential = baseDelay * Math.pow(2, retryAttempt);
            double withJitter = exponential * (0.5 + ThreadLocalRandom.current().nextDouble());
            return (long) Math.min(withJitter, maxDelay);
        }

        private int intVariable(String key, int defaultValue) {
            return variables.get(key) instanceof Integer i ? i : defaultValue;
        }

        // ── parallel ───────────────────────────────────────────────────────

        private List<String> parallelChildren(Map<String, Object> step) {
            List<String> names = new ArrayList<>();
            if (step.get("parallel") instanceof List<?> list) {
                for (Object o : list) {
                    if (o != null) {
                        names.add(String.valueOf(o));
                    }
                }
            }
            return names;
        }

        private boolean runNamedHttpSteps(List<String> names, String join) {
            String joinMode = normalizeJoin(join);
            if (names.isEmpty()) {
                return true;
            }
            boolean failFast = joinMode.equals("failfast");
            AtomicBoolean cancelled = new AtomicBoolean(false);
            BooleanSupplier cancelCheck = failFast ? cancelled::get : NOT_CANCELLED;
            AtomicReferenceArray<Thread> threads = new AtomicReferenceArray<>(names.size());
            List<Future<Boolean>> futures = new ArrayList<>();

            List<Boolean> outcomes = new ArrayList<>();
            try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
                for (int i = 0; i < names.size(); i++) {
                    String name = names.get(i);
                    int self = i;
                    futures.add(
                            executor.submit(
                                    () -> {
                                        threads.set(self, Thread.currentThread());
                                        boolean ok = runNamedHttpChild(name, cancelCheck);
                                        if (!ok && failFast) {
                                            cancelled.set(true);
                                            for (int j = 0; j < threads.length(); j++) {
                                                Thread other = threads.get(j);
                                                if (j != self && other != null) {
                                                    other.interrupt();
                                                }
                                            }
                                        }
                                        return ok;
                                    }));
                }
                for (Future<Boolean> f : futures) {
                    outcomes.add(await(f));
                }
            }
            if (joinMode.equals("any")) {
                return outcomes.stream().anyMatch(b -> b);
            }
            return outcomes.stream().allMatch(b -> b);
        }

        private boolean await(Future<Boolean> future) {
            try {
                return future.get();
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                return false;
            } catch (CancellationException | ExecutionException ex) {
                return false;
            }
        }

        private boolean runNamedHttpChild(String name, BooleanSupplier cancelled) {
            Map<String, Object> allSteps = map(workflow.get("steps"));
            if (!allSteps.containsKey(name)) {
                log.warn("Parallel child {} is missing", name);
                return false;
            }
            return executeHttpStep(name, map(allSteps.get(name)), 0, false, cancelled, null, null, null);
        }

        private String normalizeJoin(String join) {
            return join == null || join.isBlank() ? "all" : join.trim().toLowerCase(Locale.ROOT);
        }

        // ── foreach ────────────────────────────────────────────────────────

        private String foreachExpression(Map<String, Object> step) {
            Object raw = step.get("foreach");
            if (raw instanceof List<?>) {
                return "";
            }
            String s = str(raw);
            return s == null || s.isBlank() ? null : s;
        }

        private boolean executeForeach(String stepName, Map<String, Object> step, int visits) {
            List<Object> items = resolveForeachArray(step);
            int maxItems =
                    step.get("maxItems") instanceof Number n && n.intValue() > 0
                            ? Math.min(n.intValue(), MAX_FOREACH_ITEMS)
                            : MAX_FOREACH_ITEMS;
            String alias = firstNonBlank(str(step.get("as")), "item");
            String itemStepName = firstNonBlank(str(step.get("step")), null);
            Map<String, Object> allSteps = map(workflow.get("steps"));
            if (itemStepName == null || !allSteps.containsKey(itemStepName)) {
                log.warn("Foreach {} item step {} is missing", stepName, itemStepName);
                storeCoordinatorResult(stepName, false);
                return false;
            }
            Map<String, Object> itemStep = map(allSteps.get(itemStepName));

            List<Object> slice = items.subList(0, Math.min(items.size(), maxItems));
            if (slice.isEmpty()) {
                log.info("Foreach {} has no items; continuing", stepName);
                storeCoordinatorResult(stepName, true);
                return followCoordinatorTransitions(stepName, step, coordinatorResult(true), true, visits);
            }

            boolean parallelMode = "parallel".equalsIgnoreCase(str(step.get("mode")));
            boolean ok =
                    parallelMode
                            ? runForeachParallel(alias, itemStepName, itemStep, slice)
                            : runForeachSequential(alias, itemStepName, itemStep, slice);

            storeCoordinatorResult(stepName, ok);
            return followCoordinatorTransitions(stepName, step, coordinatorResult(ok), ok, visits);
        }

        private boolean runForeachSequential(
                String alias, String itemStepName, Map<String, Object> itemStep, List<Object> items) {
            int index = 0;
            for (Object item : items) {
                if (!runForeachItem(alias, itemStepName, itemStep, item, index)) {
                    return false;
                }
                index++;
            }
            return true;
        }

        private boolean runForeachParallel(
                String alias, String itemStepName, Map<String, Object> itemStep, List<Object> items) {
            for (int offset = 0; offset < items.size(); offset += MAX_PARALLEL_BRANCHES) {
                int end = Math.min(items.size(), offset + MAX_PARALLEL_BRANCHES);
                List<Future<Boolean>> futures = new ArrayList<>();
                boolean chunkOk = true;
                try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
                    for (int i = offset; i < end; i++) {
                        Object item = items.get(i);
                        int index = i;
                        futures.add(
                                executor.submit(() -> runForeachItem(alias, itemStepName, itemStep, item, index)));
                    }
                    for (Future<Boolean> f : futures) {
                        chunkOk &= await(f);
                    }
                }
                if (!chunkOk) {
                    return false;
                }
            }
            return true;
        }

        private boolean runForeachItem(
                String alias, String itemStepName, Map<String, Object> itemStep, Object item, int index) {
            return executeHttpStep(
                    itemStepName, itemStep, 0, false, NOT_CANCELLED, alias, item, itemStepName + "." + index);
        }

        @SuppressWarnings("unchecked")
        private List<Object> resolveForeachArray(Map<String, Object> step) {
            if (step.get("foreach") instanceof List<?> literal) {
                return new ArrayList<>((List<Object>) literal);
            }
            String trimmed = str(step.get("foreach")).trim();
            Matcher m = FOREACH_TOKEN.matcher(trimmed);
            if (m.matches()) {
                String key = m.group(1).trim();
                if (key.startsWith("input.")) {
                    return toList(getPath(input, key.substring("input.".length())));
                }
            }
            String replaced = replaceTokens(trimmed);
            if (replaced.isBlank() || replaced.equals(trimmed)) {
                return new ArrayList<>();
            }
            Parsed parsed = tryParseJson(replaced);
            return parsed.ok ? toList(parsed.value) : new ArrayList<>();
        }

        @SuppressWarnings("unchecked")
        private List<Object> toList(Object value) {
            if (value == null) {
                return new ArrayList<>();
            }
            if (value instanceof List<?> list) {
                return new ArrayList<>((List<Object>) list);
            }
            List<Object> single = new ArrayList<>();
            single.add(value);
            return single;
        }

        private void storeCoordinatorResult(String stepName, boolean ok) {
            results.put(stepName + ".statusCode", ok ? 200 : 500);
            results.put(stepName + ".response", coordinatorResult(ok));
        }

        private Map<String, Object> coordinatorResult(boolean ok) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("ok", ok);
            return map;
        }

        private boolean followCoordinatorTransitions(
                String stepName, Map<String, Object> step, Object result, boolean joinSucceeded, int visits) {
            Boolean branched = followTransitions(stepName, step, result, visits);
            return branched != null ? branched : joinSucceeded;
        }

        // ── http ───────────────────────────────────────────────────────────

        private record Request(String method, String url, Map<String, String> headers, String body, int timeoutSeconds) {}

        private boolean executeHttpStep(
                String stepName,
                Map<String, Object> step,
                int visits,
                boolean followTransitions,
                BooleanSupplier cancelled,
                String itemAlias,
                Object itemValue,
                String resultKey) {
            Request request;
            synchronized (itemScopes) {
                if (itemAlias != null && itemValue != null) {
                    itemScopes.put(itemAlias, itemValue);
                }
                try {
                    request = buildRequest(stepName, step);
                } finally {
                    if (itemAlias != null) {
                        itemScopes.remove(itemAlias);
                    }
                }
            }

            try {
                if (cancelled.getAsBoolean()) {
                    log.warn("Step {} cancelled", stepName);
                    return false;
                }
                HttpTransport.Response response =
                        transport.send(
                                request.method(),
                                request.url(),
                                request.headers(),
                                request.body(),
                                Duration.ofSeconds(request.timeoutSeconds()));
                String storeKey = resultKey != null ? resultKey : stepName;
                results.put(storeKey + ".statusCode", response.statusCode());

                Parsed parsed = tryParseJson(response.body());
                Object value = parsed.ok ? parsed.value : null;
                results.put(storeKey + ".response", value);

                boolean success = response.statusCode() >= 200 && response.statusCode() < 300;
                if (success && !compensationsRan) {
                    registerCompensation(stepName, step);
                }

                if (followTransitions) {
                    Boolean branched = followTransitions(stepName, step, value, visits);
                    if (branched != null) {
                        return branched;
                    }
                }
                log.info("Step {} completed with status code {}", stepName, response.statusCode());
                return success;
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                log.warn("Step {} interrupted", stepName);
                return false;
            } catch (java.net.http.HttpTimeoutException ex) {
                log.warn("Step {} timed out", stepName);
                return false;
            } catch (Exception ex) {
                log.error("Error executing step {}: {}", stepName, ex.getMessage());
                return false;
            }
        }

        private Request buildRequest(String stepName, Map<String, Object> step) {
            String method = firstNonBlank(str(step.get("method")), "GET").toUpperCase(Locale.ROOT);
            String url = replaceTokens(firstNonBlank(str(step.get("url")), ""));

            Map<String, String> headers = new LinkedHashMap<>();
            boolean hasContentType = false;
            boolean hasCorrelation = false;
            for (Map.Entry<String, Object> h : map(step.get("headers")).entrySet()) {
                String key = h.getKey();
                if ("content-type".equalsIgnoreCase(key)) {
                    hasContentType = true;
                }
                if ("x-correlation-id".equalsIgnoreCase(key)) {
                    hasCorrelation = true;
                }
                headers.put(key, replaceTokens(String.valueOf(h.getValue())));
            }
            if (correlationId != null && !correlationId.isBlank() && !hasCorrelation) {
                headers.put("X-Correlation-Id", correlationId);
            }

            String body = null;
            if (step.get("body") instanceof Map<?, ?> b && !b.isEmpty()) {
                if (method.equals("GET") || method.equals("HEAD")) {
                    log.warn("Step {}: body ignored for {}", stepName, method);
                } else {
                    body = toJson(replaceTokensDeep(b));
                    if (!hasContentType) {
                        headers.put("Content-Type", "application/json");
                    }
                }
            }

            int timeoutSeconds = DEFAULT_TIMEOUT_SECONDS;
            if (step.get("timeoutSeconds") instanceof Number n && n.intValue() > 0) {
                timeoutSeconds = n.intValue();
            }
            return new Request(method, url, headers, body, timeoutSeconds);
        }

        // ── saga / compensation ────────────────────────────────────────────

        private void registerCompensation(String stepName, Map<String, Object> step) {
            String compensate = str(step.get("compensate"));
            if (compensate == null || compensate.isBlank()) {
                return;
            }
            synchronized (compensationStack) {
                compensationStack.push(new String[] {stepName, compensate.trim()});
            }
            sagaStore.markStepCompleted(sagaId, stepName);
            log.info("Registered compensate {} for step {}", compensate, stepName);
        }

        /** Runs compensate steps LIFO; compensate steps never follow their own transitions. */
        private void runCompensations(String reason) {
            if (compensationsRan) {
                return;
            }
            List<String[]> pending = new ArrayList<>();
            synchronized (compensationStack) {
                if (compensationStack.isEmpty()) {
                    return;
                }
                compensationsRan = true;
                while (!compensationStack.isEmpty()) {
                    pending.add(compensationStack.pop());
                }
            }
            log.warn(
                    "Running {} compensation(s) for saga {}. Reason={}", pending.size(), sagaId, reason);
            sagaStore.markCompensating(sagaId);

            List<String> ran = new ArrayList<>();
            Map<String, Object> allSteps = map(workflow.get("steps"));
            for (String[] entry : pending) {
                String stepName = entry[0];
                String compensateName = entry[1];
                if (!allSteps.containsKey(compensateName)) {
                    log.error("Compensate step {} for {} not found", compensateName, stepName);
                    continue;
                }
                Map<String, Object> compensateStep = map(allSteps.get(compensateName));
                log.info("Compensating {} via {}", stepName, compensateName);

                String url = str(compensateStep.get("url"));
                boolean ok =
                        url == null
                                || url.isBlank()
                                || executeHttpStep(
                                        compensateName,
                                        compensateStep,
                                        0,
                                        false,
                                        NOT_CANCELLED,
                                        null,
                                        null,
                                        null);
                if (!ok) {
                    log.error("Compensate step {} failed for {}", compensateName, stepName);
                }
                ran.add(compensateName);
                sagaStore.markStepCompensated(sagaId, compensateName);
            }
            compensatedSteps = ran;
        }

        /** Returns null when no transition matched (caller falls back to HTTP status). */
        private Boolean followTransitions(
                String stepName, Map<String, Object> step, Object response, int visits) {
            if (!(step.get("transitions") instanceof List<?> transitions) || transitions.isEmpty()) {
                return null;
            }
            for (Object t : transitions) {
                Map<String, Object> transition = map(t);
                if (!evaluateCondition(str(transition.get("condition")), response)) {
                    continue;
                }
                String action = firstNonBlank(str(transition.get("action")), "").trim();
                String lower = action.toLowerCase(Locale.ROOT);
                if (action.isEmpty() || lower.equals("success") || lower.equals("end") || lower.equals("fail")) {
                    log.info("Step {} reached terminal action {}", stepName, action.isEmpty() ? "success" : action);
                    return !lower.equals("fail");
                }
                if (!map(workflow.get("steps")).containsKey(action)) {
                    log.warn("Transition from {} targets unknown step {}", stepName, action);
                    return false;
                }
                return executeStep(action, visits + 1);
            }
            return null;
        }

        // ── conditions ─────────────────────────────────────────────────────

        boolean evaluateCondition(String condition, Object response) {
            String trimmed = condition == null ? "" : condition.trim();
            if (trimmed.isEmpty() || trimmed.equals("default")) {
                return true;
            }
            for (String and : trimmed.split("&&")) {
                if (and.isBlank()) {
                    continue;
                }
                boolean any = false;
                for (String or : and.split("\\|\\|")) {
                    if (!or.isBlank() && evaluateSingle(or.trim(), response)) {
                        any = true;
                        break;
                    }
                }
                if (!any) {
                    return false;
                }
            }
            return true;
        }

        private boolean evaluateSingle(String condition, Object response) {
            Matcher m = CONDITION.matcher(condition);
            if (!m.find()) {
                return false;
            }
            Object left = conditionValue(m.group(1).trim(), response);
            Object right = conditionValue(m.group(3).trim(), response);
            return compare(left, m.group(2), right);
        }

        private Object conditionValue(String path, Object response) {
            if (path.startsWith("response.") && response != null) {
                Object found = getPath(response, path.substring("response.".length()));
                if (found != null) {
                    return found;
                }
            } else if (variables.containsKey(path)) {
                return variables.get(path);
            } else if (results.containsKey(path)) {
                return results.get(path);
            }
            return path.replaceAll("^[\"']|[\"']$", "");
        }

        // ── tokens ─────────────────────────────────────────────────────────

        private void initializeVariables() {
            for (Map.Entry<String, Object> e : map(workflow.get("variables")).entrySet()) {
                Map<String, Object> def = map(e.getValue());
                Object value = def.get("value");
                String raw = replaceTokens(value == null ? "" : String.valueOf(value));
                String type = firstNonBlank(str(def.get("type")), "").toLowerCase(Locale.ROOT);
                Object parsed;
                try {
                    parsed =
                            switch (type) {
                                case "int" -> Integer.parseInt(raw.trim());
                                case "double" -> Double.parseDouble(raw.trim());
                                case "bool" -> raw.equalsIgnoreCase("true");
                                default -> raw;
                            };
                } catch (NumberFormatException ex) {
                    parsed = raw;
                }
                variables.put(e.getKey(), parsed);
            }
        }

        String replaceTokens(String text) {
            Matcher m = TOKEN.matcher(text);
            StringBuilder out = new StringBuilder();
            while (m.find()) {
                m.appendReplacement(
                        out, Matcher.quoteReplacement(resolveToken(m.group(1).trim(), m.group(0))));
            }
            m.appendTail(out);
            return out.toString();
        }

        private Object replaceTokensDeep(Object value) {
            if (value instanceof String s) {
                return replaceTokens(s);
            }
            if (value instanceof List<?> list) {
                List<Object> out = new ArrayList<>();
                list.forEach(v -> out.add(replaceTokensDeep(v)));
                return out;
            }
            if (value instanceof Map<?, ?> map) {
                Map<String, Object> out = new LinkedHashMap<>();
                map.forEach((k, v) -> out.put(String.valueOf(k), replaceTokensDeep(v)));
                return out;
            }
            return value;
        }

        private String resolveToken(String key, String fallback) {
            if (key.startsWith("QuickcodeClients.") || key.startsWith("ThirdPartyServices.")) {
                String value = resolveConfigValue(key, "");
                return value != null ? value.replaceAll("/+$", "") : fallback;
            }
            if (key.startsWith("parameters.")) {
                String value =
                        resolveConfigValue(
                                key.substring("parameters.".length()), "WorkflowParameters", "Parameters");
                return value != null ? value.replaceAll("/+$", "") : fallback;
            }
            if (key.startsWith("secrets.")) {
                String value =
                        resolveConfigValue(key.substring("secrets.".length()), "WorkflowSecrets", "Secrets");
                return value != null ? value : fallback;
            }
            if (key.startsWith("GatewayServiceToken.")) {
                String target = key.substring("GatewayServiceToken.".length());
                String token = tokenMinter == null ? null : tokenMinter.apply(target);
                if (token == null || token.isBlank()) {
                    log.warn("GatewayServiceToken for {} unavailable (GATEWAY_JWT_PRIVATE_KEY missing)", target);
                    return "";
                }
                return token;
            }
            if (key.startsWith("variables.")) {
                Object v = variables.get(key.substring("variables.".length()));
                return v == null ? fallback : String.valueOf(v);
            }
            if (key.startsWith("input.")) {
                return stringify(getPath(input, key.substring("input.".length())), fallback);
            }
            String item = resolveItemScopeToken(key, fallback);
            if (!item.equals(fallback)) {
                return item;
            }
            return resolveResultToken(key, fallback);
        }

        private String resolveItemScopeToken(String key, String fallback) {
            synchronized (itemScopes) {
                for (Map.Entry<String, Object> scope : itemScopes.entrySet()) {
                    String alias = scope.getKey();
                    if (key.equalsIgnoreCase(alias)) {
                        return stringify(scope.getValue(), fallback);
                    }
                    String prefix = alias + ".";
                    if (key.regionMatches(true, 0, prefix, 0, prefix.length())) {
                        return stringify(getPath(scope.getValue(), key.substring(prefix.length())), fallback);
                    }
                }
            }
            return fallback;
        }

        /** {@code {{step.statusCode}}}, {@code {{step.response}}}, {@code {{step.response.a.b}}}. */
        private String resolveResultToken(String key, String fallback) {
            if (results.containsKey(key)) {
                return stringify(results.get(key), fallback);
            }
            int dot = key.indexOf('.');
            while (dot > 0) {
                String prefix = key.substring(0, dot);
                if (results.containsKey(prefix)) {
                    return stringify(getPath(results.get(prefix), key.substring(dot + 1)), fallback);
                }
                dot = key.indexOf('.', dot + 1);
            }
            return fallback;
        }

        // ── output ─────────────────────────────────────────────────────────

        private Object resolveOutput(Object token) {
            if (token instanceof List<?> list) {
                List<Object> out = new ArrayList<>();
                list.forEach(v -> out.add(resolveOutput(v)));
                return out;
            }
            if (token instanceof Map<?, ?> map) {
                Map<String, Object> out = new LinkedHashMap<>();
                map.forEach((k, v) -> out.put(String.valueOf(k), resolveOutput(v)));
                return out;
            }
            if (!(token instanceof String s)) {
                return token;
            }
            String replaced = replaceTokens(s);
            if (!replaced.equals(s)) {
                Parsed parsed = tryParseJson(replaced);
                if (parsed.ok) {
                    return parsed.value;
                }
            }
            if (BOOL.matcher(replaced).matches()) {
                return replaced.equalsIgnoreCase("true");
            }
            if (INT.matcher(replaced).matches()) {
                return Long.parseLong(replaced);
            }
            if (DECIMAL.matcher(replaced).matches()) {
                return Double.parseDouble(replaced);
            }
            return replaced;
        }
    }

    // ── helpers ────────────────────────────────────────────────────────────

    private record Parsed(boolean ok, Object value) {}

    private static Parsed tryParseJson(String text) {
        if (text == null || text.isBlank()) {
            return new Parsed(false, null);
        }
        try {
            return new Parsed(true, JSON.readValue(text, Object.class));
        } catch (Exception ex) {
            return new Parsed(false, null);
        }
    }

    private static String toJson(Object value) {
        try {
            return JSON.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize workflow body", ex);
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object value) {
        return value instanceof Map<?, ?> m ? (Map<String, Object>) m : new LinkedHashMap<>();
    }

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static String firstNonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    /** Dot / {@code [n]} path lookup with case-insensitive property fallback. */
    static Object getPath(Object source, String path) {
        Object current = source;
        for (String segment : path.replaceAll("\\[(\\d+)]", ".$1").split("\\.")) {
            if (segment.isEmpty()) {
                continue;
            }
            if (current instanceof Map<?, ?> m) {
                if (m.containsKey(segment)) {
                    current = m.get(segment);
                    continue;
                }
                Object match = null;
                boolean found = false;
                for (Map.Entry<?, ?> e : m.entrySet()) {
                    if (String.valueOf(e.getKey()).equalsIgnoreCase(segment)) {
                        match = e.getValue();
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    return null;
                }
                current = match;
            } else if (current instanceof List<?> list) {
                try {
                    int idx = Integer.parseInt(segment);
                    if (idx < 0 || idx >= list.size()) {
                        return null;
                    }
                    current = list.get(idx);
                } catch (NumberFormatException ex) {
                    return null;
                }
            } else {
                return null;
            }
        }
        return current;
    }

    private static String stringify(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        if (value instanceof Map<?, ?> || value instanceof List<?>) {
            return toJson(value);
        }
        return String.valueOf(value);
    }

    private static boolean isNumeric(Object value) {
        if (value instanceof Number n) {
            return Double.isFinite(n.doubleValue());
        }
        if (value instanceof String s && !s.isBlank()) {
            try {
                return Double.isFinite(Double.parseDouble(s.trim()));
            } catch (NumberFormatException ex) {
                return false;
            }
        }
        return false;
    }

    private static double toDouble(Object value) {
        return value instanceof Number n ? n.doubleValue() : Double.parseDouble(((String) value).trim());
    }

    private static boolean compare(Object left, String op, Object right) {
        if (isNumeric(left) && isNumeric(right)) {
            double l = toDouble(left);
            double r = toDouble(right);
            return switch (op) {
                case "==" -> Math.abs(l - r) < 1e-6;
                case "!=" -> Math.abs(l - r) >= 1e-6;
                case ">" -> l > r;
                case "<" -> l < r;
                case ">=" -> l >= r;
                case "<=" -> l <= r;
                default -> false;
            };
        }
        String l = left == null ? "" : String.valueOf(left).toLowerCase(Locale.ROOT);
        String r = right == null ? "" : String.valueOf(right).toLowerCase(Locale.ROOT);
        return switch (op) {
            case "==" -> l.equals(r);
            case "!=" -> !l.equals(r);
            default -> false;
        };
    }

    /**
     * {@code QuickcodeClients.IdentityModuleApi} → env {@code QuickcodeClients__IdentityModuleApi}
     * (ASP.NET style) or {@code IDENTITY_MODULE_API} (snake). Roots are tried in order for parameters/secrets.
     */
    private String resolveConfigValue(String dotted, String... roots) {
        List<String> candidates = new ArrayList<>();
        boolean hasRoot = false;
        for (String root : roots) {
            String full = root.isEmpty() ? dotted : root + "." + dotted;
            hasRoot |= !root.isEmpty();
            String envStyle = full.replace(".", "__");
            candidates.add(envStyle);
            candidates.add(envStyle.toUpperCase(Locale.ROOT));
        }
        if (!hasRoot) {
            String last = dotted.substring(dotted.lastIndexOf('.') + 1);
            candidates.add(last.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toUpperCase(Locale.ROOT));
        }
        for (String name : candidates) {
            String v = envLookup.apply(name);
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }
}
