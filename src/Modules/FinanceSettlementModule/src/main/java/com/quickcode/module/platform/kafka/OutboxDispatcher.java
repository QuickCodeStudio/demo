package com.quickcode.module.platform.kafka;

import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Drains {@link InMemoryOutboxStore} and produces to Kafka
 * (C# {@code OutboxDispatcherHostedService} parity).
 * Poll interval: env {@code Kafka__OutboxPollSeconds} / {@code KAFKA_OUTBOX_POLL_SECONDS}, default 2s (min 1).
 */
public class OutboxDispatcher implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(OutboxDispatcher.class);
    static final int DEFAULT_POLL_SECONDS = 2;
    static final int BATCH_SIZE = 20;

    private final InMemoryOutboxStore outbox;
    private final KafkaProducerService producer;
    private final int pollSeconds;
    private ScheduledExecutorService scheduler;

    public OutboxDispatcher(InMemoryOutboxStore outbox, KafkaProducerService producer) {
        this(outbox, producer, resolvePollSeconds(System::getenv));
    }

    public OutboxDispatcher(InMemoryOutboxStore outbox, KafkaProducerService producer, int pollSeconds) {
        this.outbox = outbox;
        this.producer = producer;
        this.pollSeconds = Math.max(1, pollSeconds);
    }

    static int resolvePollSeconds(Function<String, String> env) {
        for (String name : new String[] {"Kafka__OutboxPollSeconds", "KAFKA_OUTBOX_POLL_SECONDS"}) {
            String raw = env.apply(name);
            if (raw != null && !raw.isBlank()) {
                try {
                    return Math.max(1, Integer.parseInt(raw.trim()));
                } catch (NumberFormatException ignored) {
                    // fall through to next source / default
                }
            }
        }
        return DEFAULT_POLL_SECONDS;
    }

    public int pollSeconds() {
        return pollSeconds;
    }

    public synchronized void start() {
        if (scheduler != null) {
            return;
        }
        scheduler =
                Executors.newSingleThreadScheduledExecutor(
                        r -> {
                            Thread t = new Thread(r, "kafka-outbox-dispatcher");
                            t.setDaemon(true);
                            return t;
                        });
        scheduler.scheduleWithFixedDelay(this::safeDrain, pollSeconds, pollSeconds, TimeUnit.SECONDS);
        log.info("Kafka outbox dispatcher started. PollSeconds={}", pollSeconds);
    }

    private void safeDrain() {
        try {
            drainOnce();
        } catch (Exception ex) {
            log.error("Outbox dispatcher loop error", ex);
        }
    }

    /** Processes one batch; returns number of messages successfully sent. */
    public int drainOnce() {
        List<OutboxMessage> batch = outbox.dequeuePending(BATCH_SIZE);
        int sent = 0;
        for (OutboxMessage message : batch) {
            try {
                producer.produce(message.topic(), message.key(), message.payload());
                outbox.markSent(message.id());
                sent++;
                log.info(
                        "Outbox sent. Id={} Topic={} CorrelationId={}",
                        message.id(),
                        message.topic(),
                        message.correlationId());
            } catch (Exception ex) {
                outbox.markFailed(message.id(), String.valueOf(ex.getMessage()));
                log.error("Outbox produce failed. Id={} Topic={}", message.id(), message.topic(), ex);
            }
        }
        return sent;
    }

    @Override
    public synchronized void close() {
        if (scheduler != null) {
            scheduler.shutdown();
            try {
                if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                    scheduler.shutdownNow();
                }
            } catch (InterruptedException e) {
                scheduler.shutdownNow();
                Thread.currentThread().interrupt();
            }
            scheduler = null;
        }
    }
}
