"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const health_controller_1 = require("./health.controller");
const metrics_controller_1 = require("./observability/metrics.controller");
const rate_limit_middleware_1 = require("./rate-limit.middleware");
const api_log_middleware_1 = require("./api-log.middleware");
const gateway_jwt_middleware_1 = require("./gateway-jwt.middleware");
const security_headers_middleware_1 = require("./security-headers.middleware");
const global_exception_filter_1 = require("./global-exception.filter");
const kafka_producer_service_1 = require("./kafka/kafka-producer.service");
const kafka_event_catalog_service_1 = require("./kafka/kafka-event-catalog.service");
const kafka_publish_interceptor_1 = require("./kafka/kafka-publish.interceptor");
const outbox_dispatcher_service_1 = require("./kafka/outbox-dispatcher.service");
const in_memory_outbox_store_1 = require("./kafka/in-memory-outbox-store");
const in_memory_idempotency_store_1 = require("./workflows/in-memory-idempotency-store");
const endpoint_workflow_registry_1 = require("./workflows/endpoint-workflow.registry");
const endpoint_workflow_executor_1 = require("./workflows/endpoint-workflow.executor");
const endpoint_workflow_middleware_1 = require("./workflows/endpoint-workflow.middleware");
let PlatformModule = class PlatformModule {
};
exports.PlatformModule = PlatformModule;
exports.PlatformModule = PlatformModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        controllers: [health_controller_1.HealthController, metrics_controller_1.MetricsController],
        providers: [
            rate_limit_middleware_1.RateLimitMiddleware,
            api_log_middleware_1.ApiLogMiddleware,
            gateway_jwt_middleware_1.GatewayJwtMiddleware,
            security_headers_middleware_1.SecurityHeadersMiddleware,
            kafka_producer_service_1.KafkaProducerService,
            kafka_event_catalog_service_1.KafkaEventCatalogService,
            kafka_publish_interceptor_1.KafkaPublishInterceptor,
            { provide: in_memory_outbox_store_1.OUTBOX_STORE, useValue: in_memory_outbox_store_1.sharedInMemoryOutboxStore },
            outbox_dispatcher_service_1.OutboxDispatcherService,
            { provide: in_memory_idempotency_store_1.IDEMPOTENCY_STORE, useValue: in_memory_idempotency_store_1.sharedInMemoryIdempotencyStore },
            endpoint_workflow_registry_1.EndpointWorkflowRegistry,
            endpoint_workflow_executor_1.EndpointWorkflowExecutor,
            endpoint_workflow_middleware_1.EndpointWorkflowMiddleware,
            { provide: core_1.APP_INTERCEPTOR, useClass: kafka_publish_interceptor_1.KafkaPublishInterceptor },
            { provide: core_1.APP_FILTER, useClass: global_exception_filter_1.GlobalExceptionFilter },
        ],
        exports: [
            rate_limit_middleware_1.RateLimitMiddleware,
            api_log_middleware_1.ApiLogMiddleware,
            gateway_jwt_middleware_1.GatewayJwtMiddleware,
            security_headers_middleware_1.SecurityHeadersMiddleware,
            kafka_producer_service_1.KafkaProducerService,
            kafka_event_catalog_service_1.KafkaEventCatalogService,
            in_memory_outbox_store_1.OUTBOX_STORE,
            outbox_dispatcher_service_1.OutboxDispatcherService,
            in_memory_idempotency_store_1.IDEMPOTENCY_STORE,
            endpoint_workflow_registry_1.EndpointWorkflowRegistry,
            endpoint_workflow_executor_1.EndpointWorkflowExecutor,
            endpoint_workflow_middleware_1.EndpointWorkflowMiddleware,
        ],
    })
], PlatformModule);
//# sourceMappingURL=platform.module.js.map