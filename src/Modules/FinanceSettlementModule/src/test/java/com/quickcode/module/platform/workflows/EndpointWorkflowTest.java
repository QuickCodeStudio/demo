package com.quickcode.module.platform.workflows;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class EndpointWorkflowTest {

    private static final String GET_WORKFLOW =
            """
            kind: endpoint
            name: Get order
            steps:
              fetch:
                url: "{{QuickcodeClients.OrderApi}}/orders/{{input.orderId}}"
                method: GET
                headers:
                  Authorization: "Bearer {{GatewayServiceToken.OrderModule}}"
                transitions:
                  - condition: fetch.statusCode == 200
                    action: success
                  - condition: default
                    action: fail
            output:
              id: "{{input.orderId}}"
              status: "{{fetch.response.status}}"
              code: "{{fetch.statusCode}}"
              order: "{{fetch.response}}"
            """;

    private static EndpointWorkflowEntry entry(String method, String path, String yaml) {
        return new EndpointWorkflowEntry("wf", "OrderModule", path, method, "", yaml, true);
    }

    private static EndpointWorkflowRegistry registry(EndpointWorkflowEntry... entries) {
        EndpointWorkflowRegistry registry = new EndpointWorkflowRegistry();
        registry.register(List.of(entries));
        return registry;
    }

    // ── path matching ──────────────────────────────────────────────────────

    @Test
    void matchesExactPathIgnoringCaseAndTrailingSlash() {
        EndpointWorkflowRegistry registry = registry(entry("POST", "/api/orders/place", GET_WORKFLOW));

        assertNotNull(registry.find("POST", "/api/orders/place"));
        assertNotNull(registry.find("post", "/API/Orders/Place/"));
        assertNotNull(registry.find("POST", "api/orders/place?x=1"));
        assertNull(registry.find("GET", "/api/orders/place"));
        assertNull(registry.find("POST", "/api/orders/other"));
    }

    @Test
    void matchesTemplatesAndExtractsDecodedParameters() {
        EndpointWorkflowRegistry registry =
                registry(entry("GET", "/api/orders/{orderId}/lines/{lineId:int}", GET_WORKFLOW));

        EndpointWorkflowRegistry.Match match = registry.find("GET", "/api/orders/42/lines/a%20b/");

        assertNotNull(match);
        assertEquals(Map.of("orderId", "42", "lineId", "a b"), match.pathParameters());
        assertNull(registry.find("GET", "/api/orders/42"));
    }

    @Test
    void matchesOptionalParamSegment() {
        EndpointWorkflowRegistry registry = registry(entry("GET", "/api/list/{page?}", GET_WORKFLOW));

        EndpointWorkflowRegistry.Match with = registry.find("GET", "/api/list/3");
        assertNotNull(with);
        assertEquals("3", with.pathParameters().get("page"));

        EndpointWorkflowRegistry.Match without = registry.find("GET", "/api/list");
        assertNotNull(without);
        assertTrue(without.pathParameters().isEmpty());
    }

    @Test
    void skipsInactiveAndIncompleteEntries() {
        EndpointWorkflowRegistry registry = new EndpointWorkflowRegistry();
        registry.register(
                List.of(
                        new EndpointWorkflowEntry("a", "M", "/x", "GET", "", GET_WORKFLOW, false),
                        new EndpointWorkflowEntry("b", "M", "", "GET", "", GET_WORKFLOW, true),
                        new EndpointWorkflowEntry("c", "M", "/y", "GET", "", " ", true)));

        assertEquals(0, registry.size());
    }

    @Test
    void parsesRegistryJson() throws Exception {
        String json =
                "[{\"name\":\"n\",\"moduleName\":\"M\",\"endpointPath\":\"/a/{id}\",\"httpMethod\":\"GET\","
                        + "\"description\":null,\"workflowContent\":\"kind: endpoint\",\"isActive\":true}]";
        EndpointWorkflowRegistry registry = new EndpointWorkflowRegistry();
        registry.register(EndpointWorkflowRegistry.parseEntries(json));

        assertEquals(1, registry.size());
        assertEquals("7", registry.find("GET", "/a/7").pathParameters().get("id"));
    }

    @Test
    void skipsInfrastructurePaths() {
        for (String p : List.of("/", "/hc", "/health", "/metrics", "/swagger/index.html", "/favicon.ico")) {
            assertTrue(EndpointWorkflowFilter.shouldSkip(p), p);
        }
        assertFalse(EndpointWorkflowFilter.shouldSkip("/api/orders"));
    }

    // ── execution ──────────────────────────────────────────────────────────

    private record Call(String method, String url, Map<String, String> headers, String body) {}

    private static EndpointWorkflowExecutor executor(List<Call> calls, int status, String body) {
        EndpointWorkflowExecutor.HttpTransport transport =
                (String method, String url, Map<String, String> headers, String reqBody, Duration timeout) -> {
                    calls.add(new Call(method, url, headers, reqBody));
                    return new EndpointWorkflowExecutor.HttpTransport.Response(status, body);
                };
        Map<String, String> env = Map.of("QuickcodeClients__OrderApi", "http://orders/");
        return new EndpointWorkflowExecutor(target -> "token-for-" + target, transport, env::get);
    }

    @Test
    void executesSimpleGetWorkflowAndProjectsOutput() {
        List<Call> calls = new ArrayList<>();
        EndpointWorkflowExecutor executor = executor(calls, 200, "{\"status\":\"shipped\"}");
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("orderId", "42");

        EndpointWorkflowExecutor.Result result =
                executor.execute(entry("GET", "/api/orders/{orderId}", GET_WORKFLOW), input, "corr-1");

        assertTrue(result.success());
        assertTrue(result.hasOutput());
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.output();
        assertEquals(42L, ((Number) output.get("id")).longValue());
        assertEquals("shipped", output.get("status"));
        assertEquals(200L, ((Number) output.get("code")).longValue());
        assertEquals(Map.of("status", "shipped"), output.get("order"));

        assertEquals(1, calls.size());
        Call call = calls.get(0);
        assertEquals("GET", call.method());
        assertEquals("http://orders/orders/42", call.url());
        assertEquals("Bearer token-for-OrderModule", call.headers().get("Authorization"));
        assertEquals("corr-1", call.headers().get("X-Correlation-Id"));
        assertNull(call.body());
    }

    @Test
    void failTransitionMarksWorkflowFailedAndKeepsStepResults() {
        List<Call> calls = new ArrayList<>();
        EndpointWorkflowExecutor executor = executor(calls, 500, "{\"error\":\"boom\"}");

        EndpointWorkflowExecutor.Result result =
                executor.execute(
                        entry("GET", "/api/orders/{orderId}", GET_WORKFLOW),
                        Map.of("orderId", "1"),
                        "corr-2");

        assertFalse(result.success());
        assertEquals(500, result.steps().get("fetch.statusCode"));
    }

    // ── parallel / foreach / compensate / repeat / saga ────────────────────

    private static EndpointWorkflowExecutor routed(
            List<Call> calls, java.util.function.Function<Call, EndpointWorkflowExecutor.HttpTransport.Response> router) {
        EndpointWorkflowExecutor.HttpTransport transport =
                (method, url, headers, reqBody, timeout) -> {
                    Call call = new Call(method, url, headers, reqBody);
                    calls.add(call);
                    return router.apply(call);
                };
        Map<String, String> env = Map.of("QuickcodeClients__OrderApi", "http://orders");
        return new EndpointWorkflowExecutor(target -> "t", transport, env::get);
    }

    private static EndpointWorkflowExecutor.HttpTransport.Response resp(int status, String body) {
        return new EndpointWorkflowExecutor.HttpTransport.Response(status, body);
    }

    @Test
    void parallelChildrenBothSucceed() {
        List<Call> calls = java.util.Collections.synchronizedList(new ArrayList<>());
        String yaml =
                """
                kind: endpoint
                name: Parallel
                steps:
                  fanOut:
                    parallel: [a, b]
                    join: all
                    transitions:
                      - condition: response.ok == true
                        action: success
                      - condition: default
                        action: fail
                  a:
                    url: "{{QuickcodeClients.OrderApi}}/a"
                  b:
                    url: "{{QuickcodeClients.OrderApi}}/b"
                output:
                  a: "{{a.statusCode}}"
                  ok: "{{fanOut.response.ok}}"
                """;
        EndpointWorkflowExecutor executor = routed(calls, c -> resp(200, "{\"v\":1}"));

        EndpointWorkflowExecutor.Result result =
                executor.execute(entry("GET", "/p", yaml), Map.of(), "c1");

        assertTrue(result.success());
        assertEquals(2, calls.size());
        assertEquals(200, result.steps().get("a.statusCode"));
        assertEquals(200, result.steps().get("b.statusCode"));
        assertEquals(200, result.steps().get("fanOut.statusCode"));
        assertEquals(Map.of("ok", true), result.steps().get("fanOut.response"));
        @SuppressWarnings("unchecked")
        Map<String, Object> output = (Map<String, Object>) result.output();
        assertEquals(true, output.get("ok"));
        assertNotNull(result.sagaId());
        assertTrue(result.compensatedSteps().isEmpty());
    }

    @Test
    void parallelJoinAllFailsWhenOneChildFailsAndAnySucceeds() {
        String template =
                """
                kind: endpoint
                name: Parallel
                steps:
                  fanOut:
                    parallel: [a, b]
                    join: %s
                  a:
                    url: "{{QuickcodeClients.OrderApi}}/a"
                  b:
                    url: "{{QuickcodeClients.OrderApi}}/b"
                """;
        java.util.function.Function<Call, EndpointWorkflowExecutor.HttpTransport.Response> router =
                c -> c.url().endsWith("/b") ? resp(500, "{}") : resp(200, "{}");

        assertFalse(
                routed(new ArrayList<>(), router)
                        .execute(entry("GET", "/p", template.formatted("all")), Map.of(), null)
                        .success());
        assertTrue(
                routed(new ArrayList<>(), router)
                        .execute(entry("GET", "/p", template.formatted("any")), Map.of(), null)
                        .success());
    }

    @Test
    void foreachSequentialOverInputArrayWithItemTokenInUrl() {
        List<Call> calls = new ArrayList<>();
        String yaml =
                """
                kind: endpoint
                name: Foreach
                steps:
                  each:
                    foreach: "{{input.ids}}"
                    as: item
                    step: fetchOne
                    mode: sequential
                  fetchOne:
                    url: "{{QuickcodeClients.OrderApi}}/orders/{{item}}"
                """;
        EndpointWorkflowExecutor executor = routed(calls, c -> resp(200, "{\"ok\":true}"));
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("ids", List.of(7, 8, 9));

        EndpointWorkflowExecutor.Result result = executor.execute(entry("POST", "/f", yaml), input, null);

        assertTrue(result.success());
        assertEquals(
                List.of("http://orders/orders/7", "http://orders/orders/8", "http://orders/orders/9"),
                calls.stream().map(Call::url).toList());
        assertEquals(200, result.steps().get("fetchOne.0.statusCode"));
        assertEquals(200, result.steps().get("fetchOne.2.statusCode"));
        assertEquals(Map.of("ok", true), result.steps().get("fetchOne.1.response"));
        assertEquals(200, result.steps().get("each.statusCode"));
    }

    @Test
    void foreachSequentialStopsOnFirstFailureAndEmptyArraySucceeds() {
        List<Call> calls = new ArrayList<>();
        String yaml =
                """
                kind: endpoint
                name: Foreach
                steps:
                  each:
                    foreach: "{{input.ids}}"
                    step: fetchOne
                  fetchOne:
                    url: "{{QuickcodeClients.OrderApi}}/orders/{{item.id}}"
                """;
        EndpointWorkflowExecutor executor =
                routed(calls, c -> c.url().endsWith("/2") ? resp(500, "{}") : resp(200, "{}"));
        Map<String, Object> input =
                Map.of("ids", List.of(Map.of("id", 1), Map.of("id", 2), Map.of("id", 3)));

        EndpointWorkflowExecutor.Result failed = executor.execute(entry("POST", "/f", yaml), input, null);
        assertFalse(failed.success());
        assertEquals(2, calls.size());
        assertEquals(500, failed.steps().get("each.statusCode"));

        List<Call> emptyCalls = new ArrayList<>();
        EndpointWorkflowExecutor.Result empty =
                routed(emptyCalls, c -> resp(200, "{}"))
                        .execute(entry("POST", "/f", yaml), Map.of("ids", List.of()), null);
        assertTrue(empty.success());
        assertTrue(emptyCalls.isEmpty());
    }

    @Test
    void foreachParallelRunsAllItems() {
        List<Call> calls = java.util.Collections.synchronizedList(new ArrayList<>());
        String yaml =
                """
                kind: endpoint
                name: Foreach
                steps:
                  each:
                    foreach: "{{input.ids}}"
                    step: fetchOne
                    mode: parallel
                    maxItems: 10
                  fetchOne:
                    url: "{{QuickcodeClients.OrderApi}}/orders/{{item}}"
                """;
        List<Integer> ids = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            ids.add(i);
        }

        EndpointWorkflowExecutor.Result result =
                routed(calls, c -> resp(200, "{}"))
                        .execute(entry("POST", "/f", yaml), Map.of("ids", ids), null);

        assertTrue(result.success());
        assertEquals(10, calls.size(), "maxItems caps the slice");
        assertEquals(200, result.steps().get("fetchOne.9.statusCode"));
    }

    private static final String SAGA_WORKFLOW =
            """
            kind: endpoint
            name: Saga
            steps:
              reserve:
                url: "{{QuickcodeClients.OrderApi}}/reserve"
                method: POST
                compensate: release
                transitions:
                  - condition: reserve.statusCode == 200
                    action: charge
              charge:
                url: "{{QuickcodeClients.OrderApi}}/charge"
                method: POST
                compensate: refund
                transitions:
                  - condition: charge.statusCode == 200
                    action: ship
              ship:
                url: "{{QuickcodeClients.OrderApi}}/ship"
                method: POST
                transitions:
                  - condition: default
                    action: fail
              release:
                url: "{{QuickcodeClients.OrderApi}}/release"
                method: POST
                transitions:
                  - condition: default
                    action: charge
              refund:
                url: "{{QuickcodeClients.OrderApi}}/refund"
                method: POST
            """;

    @Test
    void compensatesInLifoOrderWhenLaterStepFails() {
        List<Call> calls = new ArrayList<>();
        InMemorySagaStateStore store = new InMemorySagaStateStore();
        EndpointWorkflowExecutor.HttpTransport transport =
                (method, url, headers, body, timeout) -> {
                    calls.add(new Call(method, url, headers, body));
                    return url.endsWith("/ship") ? resp(500, "{}") : resp(200, "{}");
                };
        EndpointWorkflowExecutor executor =
                new EndpointWorkflowExecutor(
                        t -> "t", transport, Map.of("QuickcodeClients__OrderApi", "http://orders")::get, store);

        EndpointWorkflowExecutor.Result result =
                executor.execute(entry("POST", "/s", SAGA_WORKFLOW), Map.of(), "corr");

        assertFalse(result.success());
        assertEquals(List.of("refund", "release"), result.compensatedSteps());
        assertEquals(
                List.of("reserve", "charge", "ship", "refund", "release").stream()
                        .map(s -> "http://orders/" + s)
                        .toList(),
                calls.stream().map(Call::url).toList(),
                "compensate steps do not follow their transitions");

        SagaStateRecord record = store.get(result.sagaId()).orElseThrow();
        assertEquals(SagaStatus.Compensated, record.status());
        assertEquals(List.of("reserve", "charge"), record.completedSteps());
        assertEquals(List.of("refund", "release"), record.compensatedSteps());
        assertEquals("corr", record.correlationId());
    }

    @Test
    void successfulSagaIsCompletedWithoutCompensation() {
        List<Call> calls = new ArrayList<>();
        InMemorySagaStateStore store = new InMemorySagaStateStore();
        EndpointWorkflowExecutor.HttpTransport transport =
                (method, url, headers, body, timeout) -> {
                    calls.add(new Call(method, url, headers, body));
                    return resp(200, "{}");
                };
        String yaml = SAGA_WORKFLOW.replace("action: fail", "action: success");
        EndpointWorkflowExecutor executor =
                new EndpointWorkflowExecutor(
                        t -> "t", transport, Map.of("QuickcodeClients__OrderApi", "http://orders")::get, store);

        EndpointWorkflowExecutor.Result result = executor.execute(entry("POST", "/s", yaml), Map.of(), null);

        assertTrue(result.success());
        assertTrue(result.compensatedSteps().isEmpty());
        assertEquals(3, calls.size());
        assertEquals(SagaStatus.Completed, store.get(result.sagaId()).orElseThrow().status());
    }

    @Test
    void repeatRetriesWithBackoffAndExposesRetryCount() {
        List<Call> calls = new ArrayList<>();
        String yaml =
                """
                kind: endpoint
                name: Repeat
                variables:
                  retryBaseDelayMs:
                    type: int
                    value: 1
                steps:
                  flaky:
                    url: "{{QuickcodeClients.OrderApi}}/flaky?attempt={{variables.currentRetryCount}}"
                    repeat: "3"
                """;
        EndpointWorkflowExecutor executor =
                routed(calls, c -> c.url().endsWith("attempt=2") ? resp(200, "{}") : resp(503, "{}"));

        EndpointWorkflowExecutor.Result result = executor.execute(entry("GET", "/r", yaml), Map.of(), null);

        assertTrue(result.success());
        assertEquals(3, calls.size());
        assertEquals("http://orders/flaky?attempt=2", calls.get(2).url());
    }

    @Test
    void repeatGivesUpAfterMaxAttempts() {
        List<Call> calls = new ArrayList<>();
        String yaml =
                """
                kind: endpoint
                name: Repeat
                variables:
                  retryBaseDelayMs:
                    type: int
                    value: 1
                steps:
                  flaky:
                    url: "{{QuickcodeClients.OrderApi}}/flaky"
                    repeat: 2
                """;

        EndpointWorkflowExecutor.Result result =
                routed(calls, c -> resp(503, "{}")).execute(entry("GET", "/r", yaml), Map.of(), null);

        assertFalse(result.success());
        assertEquals(2, calls.size());
    }

    // ── filter ─────────────────────────────────────────────────────────────

    @Test
    void filterWritesOutputWithCorrelationHeaderAndSkipsNonMatching() throws Exception {
        List<Call> calls = new ArrayList<>();
        EndpointWorkflowFilter filter =
                new EndpointWorkflowFilter(
                        registry(entry("GET", "/api/orders/{orderId}", GET_WORKFLOW)),
                        executor(calls, 200, "{\"status\":\"shipped\"}"));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/orders/42");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(request, response, chain);

        assertEquals(200, response.getStatus());
        assertNotNull(response.getHeader("X-Correlation-Id"));
        assertTrue(response.getContentAsString().contains("\"status\":\"shipped\""));
        assertNull(chain.getRequest(), "matched workflow must not continue the chain");

        MockHttpServletRequest other = new MockHttpServletRequest("GET", "/api/none");
        MockFilterChain otherChain = new MockFilterChain();
        filter.doFilter(other, new MockHttpServletResponse(), otherChain);
        assertNotNull(otherChain.getRequest());
    }

    @Test
    void filterReturns502WhenWorkflowFails() throws Exception {
        EndpointWorkflowFilter filter =
                new EndpointWorkflowFilter(
                        registry(entry("GET", "/api/orders/{orderId}", GET_WORKFLOW)),
                        executor(new ArrayList<>(), 500, "{}"));

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(new MockHttpServletRequest("GET", "/api/orders/1"), response, new MockFilterChain());

        assertEquals(502, response.getStatus());
        assertTrue(response.getContentAsString().contains("Endpoint workflow failed"));
    }

    @Test
    void filterReturns500OnUnexpectedError() throws Exception {
        EndpointWorkflowExecutor broken =
                new EndpointWorkflowExecutor(
                        t -> "x",
                        (m, u, h, b, d) -> {
                            throw new IllegalStateException("nope");
                        },
                        n -> null) {
                    @Override
                    public Result execute(
                            EndpointWorkflowEntry entry, Map<String, Object> input, String correlationId) {
                        throw new IllegalStateException("kaboom");
                    }
                };
        EndpointWorkflowFilter filter =
                new EndpointWorkflowFilter(
                        registry(entry("GET", "/api/orders/{orderId}", GET_WORKFLOW)), broken);

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(new MockHttpServletRequest("GET", "/api/orders/1"), response, new MockFilterChain());

        assertEquals(500, response.getStatus());
        assertTrue(response.getContentAsString().contains("Endpoint workflow execution error"));
    }

    // ── idempotency ────────────────────────────────────────────────────────

    private static MockHttpServletRequest withKey(String header, String key) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/orders/42");
        request.addHeader(header, key);
        return request;
    }

    @Test
    void idempotencyKeyReplaysCachedSuccessWithoutReexecuting() throws Exception {
        List<Call> calls = new ArrayList<>();
        InMemoryIdempotencyStore store = new InMemoryIdempotencyStore();
        EndpointWorkflowFilter filter =
                new EndpointWorkflowFilter(
                        registry(entry("GET", "/api/orders/{orderId}", GET_WORKFLOW)),
                        executor(calls, 200, "{\"status\":\"shipped\"}"),
                        store);

        MockHttpServletResponse first = new MockHttpServletResponse();
        filter.doFilter(withKey("Idempotency-Key", "abc"), first, new MockFilterChain());
        assertEquals(200, first.getStatus());
        assertNull(first.getHeader("X-Idempotency-Replayed"));
        assertEquals(1, calls.size());

        IdempotencyRecord record = store.tryGet("endpoint|wf|abc").orElseThrow();
        assertEquals(200, record.statusCode());

        // X-Idempotency-Key is accepted as an alias for the same raw key.
        MockHttpServletResponse second = new MockHttpServletResponse();
        filter.doFilter(withKey("X-Idempotency-Key", "abc"), second, new MockFilterChain());
        assertEquals(200, second.getStatus());
        assertEquals("true", second.getHeader("X-Idempotency-Replayed"));
        assertEquals(first.getContentAsString(), second.getContentAsString());
        assertEquals(1, calls.size(), "replay must not call the transport again");

        // A different key executes again.
        filter.doFilter(withKey("Idempotency-Key", "other"), new MockHttpServletResponse(), new MockFilterChain());
        assertEquals(2, calls.size());
    }

    @Test
    void requestsWithoutIdempotencyKeyAreNotCached() throws Exception {
        List<Call> calls = new ArrayList<>();
        InMemoryIdempotencyStore store = new InMemoryIdempotencyStore();
        EndpointWorkflowFilter filter =
                new EndpointWorkflowFilter(
                        registry(entry("GET", "/api/orders/{orderId}", GET_WORKFLOW)),
                        executor(calls, 200, "{}"),
                        store);

        filter.doFilter(new MockHttpServletRequest("GET", "/api/orders/1"), new MockHttpServletResponse(), new MockFilterChain());
        filter.doFilter(new MockHttpServletRequest("GET", "/api/orders/1"), new MockHttpServletResponse(), new MockFilterChain());

        assertEquals(2, calls.size());
        assertEquals(0, store.size());
    }

    @Test
    void idempotencyReplaysCached502WithSagaDetails() throws Exception {
        List<Call> calls = new ArrayList<>();
        EndpointWorkflowExecutor.HttpTransport transport =
                (method, url, headers, body, timeout) -> {
                    calls.add(new Call(method, url, headers, body));
                    return url.endsWith("/ship") ? resp(500, "{}") : resp(200, "{}");
                };
        EndpointWorkflowExecutor executor =
                new EndpointWorkflowExecutor(
                        t -> "t",
                        transport,
                        Map.of("QuickcodeClients__OrderApi", "http://orders")::get,
                        new InMemorySagaStateStore());
        InMemoryIdempotencyStore store = new InMemoryIdempotencyStore();
        EndpointWorkflowFilter filter =
                new EndpointWorkflowFilter(registry(entry("POST", "/s", SAGA_WORKFLOW)), executor, store);

        MockHttpServletRequest req1 = new MockHttpServletRequest("POST", "/s");
        req1.addHeader("Idempotency-Key", "k1");
        MockHttpServletResponse first = new MockHttpServletResponse();
        filter.doFilter(req1, first, new MockFilterChain());

        assertEquals(502, first.getStatus());
        String body = first.getContentAsString();
        assertTrue(body.contains("\"sagaId\":\""), body);
        assertTrue(body.contains("\"compensatedSteps\":[\"refund\",\"release\"]"), body);
        int callsAfterFirst = calls.size();

        MockHttpServletRequest req2 = new MockHttpServletRequest("POST", "/s");
        req2.addHeader("Idempotency-Key", "k1");
        MockHttpServletResponse second = new MockHttpServletResponse();
        filter.doFilter(req2, second, new MockFilterChain());

        assertEquals(502, second.getStatus());
        assertEquals("true", second.getHeader("X-Idempotency-Replayed"));
        assertEquals(body, second.getContentAsString());
        assertEquals(callsAfterFirst, calls.size());
    }

    @Test
    void unexpectedErrorsAreNotCached() throws Exception {
        EndpointWorkflowExecutor broken =
                new EndpointWorkflowExecutor(t -> "x", (m, u, h, b, d) -> resp(200, "{}"), n -> null) {
                    @Override
                    public Result execute(
                            EndpointWorkflowEntry entry, Map<String, Object> input, String correlationId) {
                        throw new IllegalStateException("kaboom");
                    }
                };
        InMemoryIdempotencyStore store = new InMemoryIdempotencyStore();
        EndpointWorkflowFilter filter =
                new EndpointWorkflowFilter(
                        registry(entry("GET", "/api/orders/{orderId}", GET_WORKFLOW)), broken, store);

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(withKey("Idempotency-Key", "boom"), response, new MockFilterChain());

        assertEquals(500, response.getStatus());
        assertTrue(store.tryGet("endpoint|wf|boom").isEmpty());
    }
}
