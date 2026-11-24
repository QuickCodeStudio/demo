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
var EndpointWorkflowMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndpointWorkflowMiddleware = void 0;
exports.shouldSkip = shouldSkip;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const endpoint_workflow_executor_1 = require("./endpoint-workflow.executor");
const endpoint_workflow_registry_1 = require("./endpoint-workflow.registry");
const in_memory_idempotency_store_1 = require("./in-memory-idempotency-store");
const MAX_BODY_BYTES = 1024 * 1024;
let EndpointWorkflowMiddleware = EndpointWorkflowMiddleware_1 = class EndpointWorkflowMiddleware {
    constructor(registry, executor, idempotencyStore) {
        this.registry = registry;
        this.executor = executor;
        this.logger = new common_1.Logger(EndpointWorkflowMiddleware_1.name);
        this.idempotencyStore = idempotencyStore ?? in_memory_idempotency_store_1.sharedInMemoryIdempotencyStore;
    }
    async use(req, res, next) {
        const path = (req.path || req.url || '').split('?')[0];
        if (shouldSkip(path)) {
            next();
            return;
        }
        const match = this.registry.find(req.method, path);
        if (!match) {
            next();
            return;
        }
        const { entry } = match;
        const correlationId = resolveCorrelationId(req);
        res.setHeader('X-Correlation-Id', correlationId);
        const idempotencyKey = resolveIdempotencyKey(req, entry.name);
        if (idempotencyKey) {
            const cached = await this.tryGetCached(idempotencyKey);
            if (cached) {
                res.status(cached.statusCode);
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('X-Idempotency-Replayed', 'true');
                res.send(cached.body);
                return;
            }
        }
        try {
            const input = await buildInput(req, match.pathParameters, correlationId);
            const result = await this.executor.execute(entry, input, correlationId);
            if (!result.success) {
                await this.writeAndCache(res, idempotencyKey, correlationId, 502, {
                    error: 'Endpoint workflow failed',
                    workflow: entry.name,
                    correlationId,
                    sagaId: result.sagaId,
                    compensatedSteps: result.compensatedSteps ?? [],
                    steps: result.steps,
                });
                return;
            }
            await this.writeAndCache(res, idempotencyKey, correlationId, 200, result.hasOutput ? result.output : result.steps);
        }
        catch (err) {
            this.logger.error(`Endpoint workflow ${entry.name} execution failed (correlation ${correlationId}): ${err instanceof Error ? err.message : String(err)}`, err instanceof Error ? err.stack : undefined);
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Endpoint workflow execution error',
                    workflow: entry.name,
                    correlationId,
                });
            }
        }
    }
    async tryGetCached(key) {
        try {
            return await this.idempotencyStore.tryGet(key);
        }
        catch (err) {
            this.logger.warn(`Idempotency lookup failed for ${key}: ${errMessage(err)}`);
            return undefined;
        }
    }
    async writeAndCache(res, idempotencyKey, correlationId, statusCode, payload) {
        res.status(statusCode).json(payload);
        if (!idempotencyKey)
            return;
        try {
            await this.idempotencyStore.save({
                key: idempotencyKey,
                statusCode,
                body: JSON.stringify(payload) ?? 'null',
                correlationId,
            });
        }
        catch (err) {
            this.logger.warn(`Idempotency save failed for ${idempotencyKey}: ${errMessage(err)}`);
        }
    }
};
exports.EndpointWorkflowMiddleware = EndpointWorkflowMiddleware;
exports.EndpointWorkflowMiddleware = EndpointWorkflowMiddleware = EndpointWorkflowMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Optional)()),
    __param(2, (0, common_1.Inject)(in_memory_idempotency_store_1.IDEMPOTENCY_STORE)),
    __metadata("design:paramtypes", [endpoint_workflow_registry_1.EndpointWorkflowRegistry,
        endpoint_workflow_executor_1.EndpointWorkflowExecutor, Object])
], EndpointWorkflowMiddleware);
function shouldSkip(path) {
    if (!path || path === '/')
        return true;
    const lower = path.toLowerCase();
    return (lower.startsWith('/hc') ||
        lower.startsWith('/health') ||
        lower.startsWith('/metrics') ||
        lower.startsWith('/swagger') ||
        lower.startsWith('/favicon'));
}
function headerValue(req, name) {
    const v = req.headers?.[name];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.trim() ? s.trim() : undefined;
}
function errMessage(err) {
    return err instanceof Error ? err.message : String(err);
}
function resolveIdempotencyKey(req, workflowName) {
    const raw = headerValue(req, 'idempotency-key') ?? headerValue(req, 'x-idempotency-key');
    return raw ? `endpoint|${workflowName}|${raw}` : undefined;
}
function resolveCorrelationId(req) {
    return (headerValue(req, 'x-correlation-id') ??
        headerValue(req, 'x-request-id') ??
        (0, crypto_1.randomUUID)().replace(/-/g, ''));
}
async function buildInput(req, pathParameters, correlationId) {
    const root = { CorrelationId: correlationId };
    for (const [key, value] of Object.entries(req.query ?? {})) {
        if (!key)
            continue;
        root[key] = Array.isArray(value) ? value.join(',') : String(value ?? '');
    }
    for (const [key, value] of Object.entries(pathParameters)) {
        if (key)
            root[key] = value;
    }
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'DELETE')
        return root;
    const body = await readBody(req);
    if (body === undefined || body === null || body === '')
        return root;
    if (typeof body === 'object' && !Array.isArray(body)) {
        Object.assign(root, body);
    }
    else {
        root.body = body;
    }
    return root;
}
async function readBody(req) {
    const parsed = req.body;
    if (parsed !== undefined && !(typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length === 0)) {
        return parsed;
    }
    if (!req.readable || typeof req.on !== 'function')
        return undefined;
    const text = await new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (chunk) => {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += buf.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error('Request body too large'));
                return;
            }
            chunks.push(buf);
        });
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
    if (!text.trim())
        return undefined;
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
//# sourceMappingURL=endpoint-workflow.middleware.js.map