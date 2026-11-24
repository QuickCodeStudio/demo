package com.quickcode.module.platform.kafka;

import jakarta.annotation.PreDestroy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KafkaAutoConfiguration {

    private final KafkaProducerService producerService;

    public KafkaAutoConfiguration(KafkaProducerService producerService) {
        this.producerService = producerService;
    }

    @Bean
    public InMemoryOutboxStore inMemoryOutboxStore() {
        return new InMemoryOutboxStore();
    }

    /** Background drain: poll seconds from {@code Kafka__OutboxPollSeconds} / {@code KAFKA_OUTBOX_POLL_SECONDS} (default 2). */
    @Bean(initMethod = "start", destroyMethod = "close")
    public OutboxDispatcher outboxDispatcher(InMemoryOutboxStore outboxStore) {
        return new OutboxDispatcher(outboxStore, producerService);
    }

    @PreDestroy
    public void shutdownProducer() {
        try {
            producerService.close();
        } catch (Exception ignored) {
            // ignore
        }
    }
}
