package com.quickcode.module.platform.kafka;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.servlet.http.HttpServletResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class OutboxTest {

    private record Sent(String topic, String key, String message) {}

    /** Producer stub: records produce calls, optionally failing the first N. */
    private static final class FakeProducer extends KafkaProducerService {
        final List<Sent> sent = new ArrayList<>();
        int failFirst;
        boolean enabled = true;

        @Override
        public void produce(String topic, String key, String message) {
            if (failFirst > 0) {
                failFirst--;
                throw new IllegalStateException("broker down");
            }
            sent.add(new Sent(topic, key, message));
        }

        @Override
        public boolean isEnabled() {
            return enabled;
        }
    }

    private static KafkaEventCatalogService catalog() {
        return new KafkaEventCatalogService(null) {
            @Override
            public KafkaEventEntry find(String httpMethod, String path) {
                return "POST".equalsIgnoreCase(httpMethod) && "/api/orders".equals(path)
                        ? new KafkaEventEntry("orders-topic", "/api/orders", "POST", true)
                        : null;
            }
        };
    }

    @Test
    void enqueueThenDrainSendsAndEvictsMessage() {
        InMemoryOutboxStore store = new InMemoryOutboxStore();
        FakeProducer producer = new FakeProducer();
        OutboxDispatcher dispatcher = new OutboxDispatcher(store, producer, 1);

        store.enqueue(new OutboxMessage("t", "k1", "p1", "c1"));
        store.enqueue(new OutboxMessage("t", "k2", "p2", "c2"));
        assertEquals(2, store.pendingCount());

        assertEquals(2, dispatcher.drainOnce());

        assertEquals(List.of("k1", "k2"), producer.sent.stream().map(Sent::key).toList());
        assertEquals(0, store.pendingCount());
        assertEquals(0, dispatcher.drainOnce());
    }

    @Test
    void failedProduceKeepsMessagePendingAndRetries() {
        InMemoryOutboxStore store = new InMemoryOutboxStore();
        FakeProducer producer = new FakeProducer();
        producer.failFirst = 1;
        OutboxDispatcher dispatcher = new OutboxDispatcher(store, producer, 1);
        OutboxMessage message = new OutboxMessage("t", "k", "p", "c");
        store.enqueue(message);

        assertEquals(0, dispatcher.drainOnce());
        assertEquals(1, message.attemptCount());
        assertEquals("broker down", message.lastError());
        assertNull(message.sentAt());
        assertEquals(1, store.pendingCount());

        assertEquals(1, dispatcher.drainOnce());
        assertNotNull(message.sentAt());
        assertNull(message.lastError());
        assertEquals(0, store.pendingCount());
    }

    @Test
    void pollSecondsFromEnvWithDefaultAndFloor() {
        assertEquals(2, OutboxDispatcher.resolvePollSeconds(n -> null));
        assertEquals(5, OutboxDispatcher.resolvePollSeconds(Map.of("Kafka__OutboxPollSeconds", "5")::get));
        assertEquals(7, OutboxDispatcher.resolvePollSeconds(Map.of("KAFKA_OUTBOX_POLL_SECONDS", "7")::get));
        assertEquals(1, OutboxDispatcher.resolvePollSeconds(Map.of("KAFKA_OUTBOX_POLL_SECONDS", "0")::get));
        assertEquals(2, OutboxDispatcher.resolvePollSeconds(Map.of("KAFKA_OUTBOX_POLL_SECONDS", "abc")::get));
    }

    @Test
    void filterEnqueuesInsteadOfProducingForSuccessfulResponses() throws Exception {
        InMemoryOutboxStore store = new InMemoryOutboxStore();
        FakeProducer producer = new FakeProducer();
        KafkaPublishFilter filter = new KafkaPublishFilter(catalog(), producer, store);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/orders");
        request.setContent("{\"a\":1}".getBytes());
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(
                request,
                response,
                new MockFilterChain() {
                    @Override
                    public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res)
                            throws java.io.IOException, jakarta.servlet.ServletException {
                        ((HttpServletResponse) res).setStatus(201);
                        res.setContentType("application/json");
                        res.getWriter().write("{\"id\":7}");
                    }
                });

        assertEquals(201, response.getStatus());
        assertTrue(producer.sent.isEmpty(), "filter must not produce directly");
        List<OutboxMessage> pending = store.dequeuePending(10);
        assertEquals(1, pending.size());
        assertEquals("orders-topic", pending.get(0).topic());
        assertEquals("POST|/api/orders|7", pending.get(0).key());
        assertTrue(pending.get(0).payload().contains("\"statusCode\":201"));

        new OutboxDispatcher(store, producer, 1).drainOnce();
        assertEquals(1, producer.sent.size());
        assertEquals("orders-topic", producer.sent.get(0).topic());
        assertEquals(0, store.pendingCount());
    }

    @Test
    void filterDoesNotEnqueueErrorResponsesOrUnmatchedPaths() throws Exception {
        InMemoryOutboxStore store = new InMemoryOutboxStore();
        KafkaPublishFilter filter = new KafkaPublishFilter(catalog(), new FakeProducer(), store);

        MockHttpServletResponse error = new MockHttpServletResponse();
        filter.doFilter(
                new MockHttpServletRequest("POST", "/api/orders"),
                error,
                new MockFilterChain() {
                    @Override
                    public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) {
                        ((HttpServletResponse) res).setStatus(400);
                    }
                });
        filter.doFilter(new MockHttpServletRequest("POST", "/api/other"), new MockHttpServletResponse(), new MockFilterChain());

        assertEquals(0, store.pendingCount());
    }
}
