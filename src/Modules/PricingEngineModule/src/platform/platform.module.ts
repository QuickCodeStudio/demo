import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './health.controller';
import { MetricsController } from './observability/metrics.controller';
import { RateLimitMiddleware } from './rate-limit.middleware';
import { ApiLogMiddleware } from './api-log.middleware';
import { GatewayJwtMiddleware } from './gateway-jwt.middleware';
import { SecurityHeadersMiddleware } from './security-headers.middleware';
import { GlobalExceptionFilter } from './global-exception.filter';
import { KafkaProducerService } from './kafka/kafka-producer.service';
import { KafkaEventCatalogService } from './kafka/kafka-event-catalog.service';
import { KafkaPublishInterceptor } from './kafka/kafka-publish.interceptor';
import { OutboxDispatcherService } from './kafka/outbox-dispatcher.service';
import { OUTBOX_STORE, sharedInMemoryOutboxStore } from './kafka/in-memory-outbox-store';
import { IDEMPOTENCY_STORE, sharedInMemoryIdempotencyStore } from './workflows/in-memory-idempotency-store';
import { EndpointWorkflowRegistry } from './workflows/endpoint-workflow.registry';
import { EndpointWorkflowExecutor } from './workflows/endpoint-workflow.executor';
import { EndpointWorkflowMiddleware } from './workflows/endpoint-workflow.middleware';

/**
 * Nest parity of C# module API cross-cutting concerns:
 * Health (/hc), metrics (/metrics), rate limit, API log, Gateway JWT,
 * security headers, ProblemDetails, Kafka (outbox + dispatcher), endpoint workflows (+ idempotency).
 */
@Global()
@Module({
  controllers: [HealthController, MetricsController],
  providers: [
    RateLimitMiddleware,
    ApiLogMiddleware,
    GatewayJwtMiddleware,
    SecurityHeadersMiddleware,
    KafkaProducerService,
    KafkaEventCatalogService,
    KafkaPublishInterceptor,
    { provide: OUTBOX_STORE, useValue: sharedInMemoryOutboxStore },
    OutboxDispatcherService,
    { provide: IDEMPOTENCY_STORE, useValue: sharedInMemoryIdempotencyStore },
    EndpointWorkflowRegistry,
    EndpointWorkflowExecutor,
    EndpointWorkflowMiddleware,
    { provide: APP_INTERCEPTOR, useClass: KafkaPublishInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
  exports: [
    RateLimitMiddleware,
    ApiLogMiddleware,
    GatewayJwtMiddleware,
    SecurityHeadersMiddleware,
    KafkaProducerService,
    KafkaEventCatalogService,
    OUTBOX_STORE,
    OutboxDispatcherService,
    IDEMPOTENCY_STORE,
    EndpointWorkflowRegistry,
    EndpointWorkflowExecutor,
    EndpointWorkflowMiddleware,
  ],
})
export class PlatformModule {}
