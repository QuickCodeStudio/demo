package com.quickcode.module.platform.kafka;

import java.time.Duration;
import java.util.Properties;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class KafkaProducerService implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(KafkaProducerService.class);

    private final String bootstrapServers;
    private final KafkaProducer<String, String> producer;

    public KafkaProducerService() {
        this.bootstrapServers =
                firstNonBlank(
                        System.getenv("KAFKA_BOOTSTRAP_SERVERS"),
                        System.getenv("Kafka__BootstrapServers"),
                        "");
        if (bootstrapServers.isBlank()) {
            log.warn("Kafka producer: BootstrapServers is not configured");
            this.producer = null;
            return;
        }
        String clientId = firstNonBlank(System.getenv("MODULE_NAME"), "Template0ModuleName");
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.CLIENT_ID_CONFIG, clientId);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, (int) Duration.ofSeconds(30).toMillis());
        this.producer = new KafkaProducer<>(props);
        log.info("Kafka producer initialized. BootstrapServers={}", bootstrapServers);
    }

    public void produce(String topic, String key, String message) {
        if (producer == null || bootstrapServers.isBlank()) {
            return;
        }
        try {
            producer.send(new ProducerRecord<>(topic, key, message)).get();
            log.debug("Kafka message delivered. Topic={} Key={}", topic, key);
        } catch (Exception ex) {
            log.error("Kafka produce failed. Topic={} Key={}", topic, key, ex);
            throw new IllegalStateException("Kafka produce failed", ex);
        }
    }

    @Override
    public void close() {
        if (producer != null) {
            producer.close(Duration.ofSeconds(5));
        }
    }

    public boolean isEnabled() {
        return producer != null;
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
