"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var KafkaEventCatalogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaEventCatalogService = void 0;
const common_1 = require("@nestjs/common");
const gateway_jwt_middleware_1 = require("../gateway-jwt.middleware");
const fetch_with_retry_1 = require("../http/fetch-with-retry");
let KafkaEventCatalogService = KafkaEventCatalogService_1 = class KafkaEventCatalogService {
    constructor() {
        this.logger = new common_1.Logger(KafkaEventCatalogService_1.name);
        this.cache = null;
        this.ttlMs = 5 * 60 * 1000;
    }
    async findAsync(httpMethod, path) {
        if (!path)
            return null;
        const entries = await this.getEntries();
        const method = httpMethod.toUpperCase();
        for (const candidate of pathVariants(path)) {
            for (const e of entries) {
                if (!e.isActive)
                    continue;
                if (e.httpMethod.toUpperCase() !== method)
                    continue;
                if (pathMatches(e.urlPath, candidate)) {
                    return {
                        ...e,
                        topicName: `${e.topicName}_${method.toLowerCase()}`,
                    };
                }
            }
        }
        return null;
    }
    async getEntries() {
        if (this.cache && Date.now() - this.cache.at < this.ttlMs) {
            return this.cache.entries;
        }
        try {
            const loaded = await this.loadEvents();
            this.cache = { at: Date.now(), entries: loaded };
            return loaded;
        }
        catch (err) {
            this.logger.error('Failed to load Kafka event catalog', err);
            return [];
        }
    }
    async loadEvents() {
        const baseUrl = (process.env.IDENTITY_MODULE_API ||
            process.env.QuickcodeClients__IdentityModuleApi ||
            '').trim();
        if (!baseUrl) {
            this.logger.warn('IDENTITY_MODULE_API / QuickcodeClients__IdentityModuleApi not configured; Kafka catalog is empty');
            return [];
        }
        const token = resolveCatalogBearerToken();
        if (!token) {
            this.logger.warn('Kafka catalog auth missing: set GATEWAY_JWT_PRIVATE_KEY (preferred, same as C# modules via .env), or GATEWAY_SERVICE_BEARER / IDENTITY_SERVICE_BEARER');
            return [];
        }
        const url = combine(baseUrl, 'api/identity-module/kafka-events/get-kafka-events');
        const res = await (0, fetch_with_retry_1.fetchWithRetry)(url, { headers: { Authorization: `Bearer ${token}` } }, { retries: 3, baseDelayMs: 1000 });
        if (!res.ok) {
            throw new Error(`Kafka catalog HTTP ${res.status}`);
        }
        const raw = (await res.json());
        return (raw ?? []).map((x) => ({
            topicName: String(x.topicName ?? x.TopicName ?? ''),
            urlPath: String(x.urlPath ?? x.UrlPath ?? ''),
            httpMethod: String(x.httpMethod ?? x.HttpMethod ?? ''),
            isActive: Boolean(x.isActive ?? x.IsActive ?? false),
        }));
    }
};
exports.KafkaEventCatalogService = KafkaEventCatalogService;
exports.KafkaEventCatalogService = KafkaEventCatalogService = KafkaEventCatalogService_1 = __decorate([
    (0, common_1.Injectable)()
], KafkaEventCatalogService);
function resolveCatalogBearerToken() {
    const minted = (0, gateway_jwt_middleware_1.createGatewayServiceToken)('IdentityModule');
    if (minted)
        return minted;
    const fromEnv = (process.env.GATEWAY_SERVICE_BEARER ||
        process.env.IDENTITY_SERVICE_BEARER ||
        '').trim();
    return fromEnv || null;
}
function combine(baseUrl, path) {
    return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
function pathVariants(path) {
    const out = [path];
    const trimmed = path.replace(/\/+$/, '');
    if (trimmed && trimmed !== path)
        out.push(trimmed);
    if (path.startsWith('/'))
        out.push(path.slice(1));
    else
        out.push(`/${path}`);
    return out;
}
function pathMatches(template, path) {
    const t = template.replace(/\/+$/, '').toLowerCase();
    const p = path.replace(/\/+$/, '').toLowerCase();
    if (t === p)
        return true;
    const tParts = t.split('/').filter(Boolean);
    const pParts = p.split('/').filter(Boolean);
    if (tParts.length !== pParts.length)
        return false;
    for (let i = 0; i < tParts.length; i++) {
        if (tParts[i].startsWith('{') && tParts[i].endsWith('}'))
            continue;
        if (tParts[i] !== pParts[i])
            return false;
    }
    return true;
}
//# sourceMappingURL=kafka-event-catalog.service.js.map