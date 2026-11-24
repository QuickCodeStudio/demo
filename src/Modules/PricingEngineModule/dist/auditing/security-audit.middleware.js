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
var SecurityAuditMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityAuditMiddleware = void 0;
exports.extractModuleName = extractModuleName;
exports.isHealthPath = isHealthPath;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const audit_log_1 = require("./audit-log");
const audit_log_writer_interface_1 = require("./audit-log-writer.interface");
let SecurityAuditMiddleware = SecurityAuditMiddleware_1 = class SecurityAuditMiddleware {
    constructor(auditLogWriter) {
        this.auditLogWriter = auditLogWriter;
        this.logger = new common_1.Logger(SecurityAuditMiddleware_1.name);
    }
    use(req, res, next) {
        const path = req.path || req.url || '';
        if (isHealthPath(path) || path.toLowerCase().startsWith('/swagger')) {
            next();
            return;
        }
        const startTime = new Date();
        const started = Date.now();
        res.on('finish', () => {
            const auditInfo = {
                timestamp: startTime,
                userId: getUserId(req),
                userAgent: String(req.headers['user-agent'] ?? ''),
                ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
                method: req.method,
                path,
                queryString: req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '',
                isAuthenticated: !!req.user,
                statusCode: res.statusCode,
                durationMs: Date.now() - started,
                responseSize: Number(res.getHeader('content-length') ?? 0),
            };
            this.logSecurityAudit(auditInfo);
            void this.queueSecurityAudit(req, auditInfo).catch((err) => this.logger.error(`Security audit error for ${auditInfo.path}`, err));
        });
        next();
    }
    async queueSecurityAudit(req, auditInfo) {
        const correlationId = String(req.headers['x-correlation-id'] ?? '') ||
            String(req.headers['x-request-id'] ?? '') ||
            (0, crypto_1.randomUUID)();
        const auditLog = (0, audit_log_1.createAuditLog)({
            entityName: 'HttpRequest',
            entityId: correlationId,
            action: auditInfo.method,
            userId: auditInfo.userId,
            userName: req.user?.name ?? req.user?.username ?? null,
            timestamp: auditInfo.timestamp,
            durationMs: auditInfo.durationMs,
            statusCode: auditInfo.statusCode,
            requestModule: extractModuleName(auditInfo.path),
            requestPath: auditInfo.path,
            ipAddress: auditInfo.ipAddress,
            userAgent: auditInfo.userAgent,
            correlationId,
            isSuccess: auditInfo.statusCode < 400,
            isChanged: false,
            newValues: JSON.stringify(auditInfo),
        });
        await this.auditLogWriter.queueAuditLogAsync(auditLog);
    }
    logSecurityAudit(auditInfo) {
        const msg = `Security Audit: ${auditInfo.method} ${auditInfo.path} - User: ${auditInfo.userId} - ` +
            `IP: ${auditInfo.ipAddress} - Status: ${auditInfo.statusCode} - Duration: ${auditInfo.durationMs}ms`;
        if (auditInfo.statusCode >= 400)
            this.logger.warn(msg);
        else
            this.logger.log(msg);
        if (isCriticalSecurityEvent(auditInfo)) {
            this.logger.warn(`CRITICAL SECURITY EVENT: ${JSON.stringify(auditInfo)}`);
        }
    }
};
exports.SecurityAuditMiddleware = SecurityAuditMiddleware;
exports.SecurityAuditMiddleware = SecurityAuditMiddleware = SecurityAuditMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(audit_log_writer_interface_1.AUDIT_LOG_WRITER)),
    __metadata("design:paramtypes", [Object])
], SecurityAuditMiddleware);
function getUserId(req) {
    const user = req.user;
    if (user?.id != null)
        return String(user.id);
    if (user?.sub != null)
        return String(user.sub);
    if (user?.userId != null)
        return String(user.userId);
    return 'anonymous';
}
function isCriticalSecurityEvent(auditInfo) {
    return (auditInfo.statusCode === 401 ||
        auditInfo.statusCode === 403 ||
        auditInfo.path.includes('/admin') ||
        auditInfo.path.includes('/api/auth'));
}
function extractModuleName(path) {
    if (!path?.trim())
        return '';
    const segments = path.split('/').filter(Boolean);
    const apiIndex = segments.findIndex((s) => s.toLowerCase() === 'api');
    if (apiIndex >= 0 && apiIndex + 1 < segments.length)
        return segments[apiIndex + 1];
    return segments[0] ?? '';
}
function isHealthPath(path) {
    const normalized = (path.split('?')[0] || '').replace(/\/+$/, '') || '/';
    const lower = normalized.toLowerCase();
    return (lower === '/hc' ||
        lower === '/health' ||
        lower === '/metrics' ||
        lower.endsWith('/hc') ||
        lower.endsWith('/health') ||
        lower.endsWith('/metrics'));
}
//# sourceMappingURL=security-audit.middleware.js.map