"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var KafkaPublishInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaPublishInterceptor = void 0;
exports.buildStableKey = buildStableKey;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const constants_1 = require("@nestjs/common/constants");
const rxjs_1 = require("rxjs");
const security_audit_middleware_1 = require("../../auditing/security-audit.middleware");
const kafka_event_catalog_service_1 = require("./kafka-event-catalog.service");
const in_memory_outbox_store_1 = require("./in-memory-outbox-store");
const sensitive_payload_redactor_1 = require("./sensitive-payload-redactor");
let KafkaPublishInterceptor = KafkaPublishInterceptor_1 = class KafkaPublishInterceptor {
    constructor(catalog, outbox) {
        this.catalog = catalog;
        this.logger = new common_1.Logger(KafkaPublishInterceptor_1.name);
        this.outbox = outbox ?? in_memory_outbox_store_1.sharedInMemoryOutboxStore;
    }
    intercept(context, next) {
        const http = context.switchToHttp();
        const req = http.getRequest();
        const res = http.getResponse();
        const path = req.path || req.url || '';
        if (isExcludedPath(path)) {
            return next.handle();
        }
        const started = Date.now();
        const handler = typeof context.getHandler === 'function' ? context.getHandler() : undefined;
        return next.handle().pipe((0, rxjs_1.mergeMap)(async (body) => {
            await this.enqueueSafe(req, res, handler, body, Date.now() - started);
            return body;
        }));
    }
    async enqueueSafe(req, res, handler, body, elapsedMs) {
        try {
            const statusCode = resolveSuccessStatus(req, res, handler);
            if (statusCode >= 400)
                return;
            const path = req.path || req.url || '';
            const hit = await this.catalog.findAsync(req.method, path);
            if (!hit)
                return;
            const correlationId = resolveCorrelationId(req);
            const kafkaMessage = {
                correlationId,
                requestInfo: {
                    path,
                    method: req.method,
                    headers: (0, sensitive_payload_redactor_1.redactSensitiveHeaders)(req.headers),
                    body: (0, sensitive_payload_redactor_1.redactSensitivePayload)(req.body ?? {}),
                },
                responseInfo: {
                    statusCode,
                    headers: (0, sensitive_payload_redactor_1.redactSensitiveHeaders)((typeof res.getHeaders === 'function' ? res.getHeaders() : {})),
                    body: (0, sensitive_payload_redactor_1.redactSensitivePayload)(body ?? {}),
                },
                exceptionMessage: '',
                elapsedMilliseconds: elapsedMs,
                timestamp: new Date().toISOString(),
            };
            const key = buildStableKey(req.method, path, correlationId, body);
            await this.outbox.enqueue({
                topic: hit.topicName,
                key,
                payload: JSON.stringify(kafkaMessage),
                correlationId,
            });
            this.logger.log(`Kafka outbox enqueued. Topic=${hit.topicName} Key=${key} CorrelationId=${correlationId}`);
        }
        catch (err) {
            this.logger.error(`Kafka outbox enqueue failed. Path=${req.path}`, err);
        }
    }
};
exports.KafkaPublishInterceptor = KafkaPublishInterceptor;
exports.KafkaPublishInterceptor = KafkaPublishInterceptor = KafkaPublishInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, common_1.Inject)(in_memory_outbox_store_1.OUTBOX_STORE)),
    __metadata("design:paramtypes", [kafka_event_catalog_service_1.KafkaEventCatalogService, Object])
], KafkaPublishInterceptor);
function resolveSuccessStatus(req, res, handler) {
    const current = res.statusCode;
    if (typeof current === 'number' && current !== common_1.HttpStatus.OK)
        return current;
    if (typeof handler === 'function') {
        const declared = Reflect.getMetadata(constants_1.HTTP_CODE_METADATA, handler);
        if (typeof declared === 'number')
            return declared;
    }
    if (req.method?.toUpperCase() === 'POST')
        return common_1.HttpStatus.CREATED;
    return typeof current === 'number' ? current : common_1.HttpStatus.OK;
}
function resolveCorrelationId(req) {
    const header = (name) => {
        const v = req.headers?.[name];
        const s = Array.isArray(v) ? v[0] : v;
        return s && s.trim() ? s.trim() : undefined;
    };
    return header('x-correlation-id') ?? header('x-request-id') ?? (0, crypto_1.randomUUID)().replace(/-/g, '');
}
function buildStableKey(method, path, correlationId, body) {
    let businessId;
    if (body && typeof body === 'object' && !Array.isArray(body)) {
        const record = body;
        const raw = record.id ?? record.Id;
        if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'bigint') {
            const s = String(raw);
            if (s.trim())
                businessId = s;
        }
    }
    return `${method}|${path}|${businessId ?? correlationId}`;
}
function isExcludedPath(path) {
    if (!path)
        return true;
    const p = path.toLowerCase();
    return ((0, security_audit_middleware_1.isHealthPath)(p) ||
        p.startsWith('/swagger') ||
        p.startsWith('/favicon') ||
        p.includes('/kafka-events'));
}
//# sourceMappingURL=kafka-publish.interceptor.js.map