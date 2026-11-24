import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

/**
 * Nest parity of C# KafkaProducerWrapper — no-op when KAFKA_BOOTSTRAP_SERVERS empty.
 */
@Injectable()
export class KafkaProducerService implements OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly bootstrapServers: string;
  private producer: Producer | null = null;

  constructor() {
    this.bootstrapServers = (
      process.env.KAFKA_BOOTSTRAP_SERVERS ||
      process.env.Kafka__BootstrapServers ||
      ''
    ).trim();
    if (!this.bootstrapServers) {
      this.logger.warn('Kafka producer: BootstrapServers is not configured');
      return;
    }
    this.logger.log(
      `Kafka producer initialized. BootstrapServers=${this.bootstrapServers}`,
    );
    const kafka = new Kafka({
      clientId: process.env.MODULE_NAME || 'PricingEngineModule',
      brokers: this.bootstrapServers.split(',').map((s) => s.trim()).filter(Boolean),
      retry: { retries: 3 },
    });
    this.producer = kafka.producer();
    void this.producer.connect().catch((err) =>
      this.logger.error('Kafka producer connect failed', err as Error),
    );
  }

  async produceAsync(topic: string, key: string, message: string): Promise<void> {
    if (!this.producer || !this.bootstrapServers) return;
    try {
      await this.producer.send({
        topic,
        messages: [{ key, value: message }],
      });
      this.logger.debug(`Kafka message delivered. Topic=${topic} Key=${key}`);
    } catch (err) {
      this.logger.error(
        `Kafka produce failed. Topic=${topic} Key=${key}`,
        err as Error,
      );
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer) {
      try {
        await this.producer.disconnect();
      } catch {
        /* ignore */
      }
    }
  }
}
