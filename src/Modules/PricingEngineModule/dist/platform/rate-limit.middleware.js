"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RateLimitMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitMiddleware = void 0;
const common_1 = require("@nestjs/common");
const security_audit_middleware_1 = require("../auditing/security-audit.middleware");
const swagger_ui_1 = require("./swagger-ui");
let RateLimitMiddleware = RateLimitMiddleware_1 = class RateLimitMiddleware {
    constructor() {
        this.logger = new common_1.Logger(RateLimitMiddleware_1.name);
        this.buckets = new Map();
        this.enabled = (process.env.RATE_LIMIT_ENABLED ?? 'true').toLowerCase() !== 'false';
        this.windowSeconds = Math.max(1, Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60));
        this.permits = {
            general: Math.max(1, Number(process.env.RATE_LIMIT_PERMIT ?? 1000)),
            auth: Math.max(1, Number(process.env.RATE_LIMIT_AUTH_PERMIT ?? 10)),
            refresh: Math.max(1, Number(process.env.RATE_LIMIT_REFRESH_PERMIT ?? 60)),
        };
    }
    use(req, res, next) {
        const path = req.path || req.url || '';
        if (!this.enabled || (0, security_audit_middleware_1.isHealthPath)(path) || (0, swagger_ui_1.isSwaggerPath)(path)) {
            next();
            return;
        }
        const policy = policyKey(req.path || '');
        const permit = this.permits[policy];
        const key = `${clientKey(req)}|${policy}`;
        const now = Date.now();
        let bucket = this.buckets.get(key);
        if (!bucket || bucket.resetAt <= now) {
            bucket = { count: 0, resetAt: now + this.windowSeconds * 1000 };
            this.buckets.set(key, bucket);
        }
        bucket.count += 1;
        if (bucket.count > permit) {
            const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
            res.setHeader('Retry-After', String(retryAfter));
            this.logger.warn(`Rate limit exceeded for ${key} (limit=${permit})`);
            res.status(429).send('Rate limit exceeded. Please try again later.');
            return;
        }
        next();
    }
};
exports.RateLimitMiddleware = RateLimitMiddleware;
exports.RateLimitMiddleware = RateLimitMiddleware = RateLimitMiddleware_1 = __decorate([
    (0, common_1.Injectable)()
], RateLimitMiddleware);
function clientKey(req) {
    return (req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.ip ||
        req.socket.remoteAddress ||
        'unknown');
}
function policyKey(path) {
    const p = path.toLowerCase();
    if (p.includes('/api/auth/refresh'))
        return 'refresh';
    if (p.includes('/api/auth/login') || p.includes('/api/auth/token'))
        return 'auth';
    return 'general';
}
//# sourceMappingURL=rate-limit.middleware.js.map