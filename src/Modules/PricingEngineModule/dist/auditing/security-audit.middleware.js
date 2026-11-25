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
                userGroup: getUserGroup(req),
                clientId: getClientId(req),
                tokenUse: header(req, 'x-token-use') || claim(req, 'token_use'),
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
        const correlationId = header(req, 'x-correlation-id') ||
            header(req, 'x-request-id') ||
            (0, crypto_1.randomUUID)();
        const changeParts = [];
        if (auditInfo.tokenUse)
            changeParts.push(`token_use=${auditInfo.tokenUse}`);
        const clientApp = header(req, 'x-client-app');
        if (clientApp)
            changeParts.push(`client_app=${clientApp}`);
        const auditLog = (0, audit_log_1.createAuditLog)({
            entityName: 'HttpRequest',
            entityId: correlationId,
            action: auditInfo.method,
            userId: auditInfo.userId,
            userName: req.user?.name ?? req.user?.username ?? null,
            userGroup: auditInfo.userGroup,
            timestamp: auditInfo.timestamp,
            durationMs: auditInfo.durationMs,
            statusCode: auditInfo.statusCode,
            requestModule: extractModuleName(auditInfo.path),
            requestPath: auditInfo.path,
            ipAddress: auditInfo.ipAddress,
            userAgent: auditInfo.userAgent,
            clientId: auditInfo.clientId,
            correlationId,
            changeSummary: changeParts.length ? changeParts.join(';') : null,
            isSuccess: auditInfo.statusCode < 400,
            isChanged: false,
            newValues: JSON.stringify(auditInfo),
        });
        await this.auditLogWriter.queueAuditLogAsync(auditLog);
    }
    logSecurityAudit(auditInfo) {
        const msg = `Security Audit: ${auditInfo.method} ${auditInfo.path} - User: ${auditInfo.userId} - ` +
            `Group: ${auditInfo.userGroup ?? ''} - ClientId: ${auditInfo.clientId ?? ''} - ` +
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
function header(req, name) {
    const value = req.headers[name];
    if (Array.isArray(value))
        return (value[0] ?? '').trim();
    return String(value ?? '').trim();
}
function claim(req, key) {
    const user = req.user;
    if (!user)
        return '';
    if (user[key] != null)
        return String(user[key]).trim();
    if (Array.isArray(user.claims)) {
        const found = user.claims.find((c) => c?.type === key || c?.Type === key);
        if (found?.value != null || found?.Value != null)
            return String(found.value ?? found.Value).trim();
    }
    return '';
}
function getUserId(req) {
    const fromHeader = header(req, 'x-user-id');
    if (fromHeader)
        return fromHeader;
    const user = req.user;
    if (user?.id != null)
        return String(user.id);
    if (user?.sub != null)
        return String(user.sub);
    if (user?.userId != null)
        return String(user.userId);
    const nameId = claim(req, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier');
    if (nameId)
        return nameId;
    return 'anonymous';
}
function getUserGroup(req) {
    const fromHeader = header(req, 'x-permission-group');
    if (fromHeader)
        return fromHeader;
    const fromClaim = claim(req, 'PermissionGroupName') ||
        String(req.user?.PermissionGroupName ?? req.user?.permissionGroupName ?? '').trim();
    return fromClaim || null;
}
function getClientId(req) {
    const fromHeader = header(req, 'x-client-id');
    if (fromHeader)
        return fromHeader;
    const fromClaim = claim(req, 'client_id') || claim(req, 'guest_client_id');
    return fromClaim || null;
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