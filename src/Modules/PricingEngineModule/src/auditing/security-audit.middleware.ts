import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { createAuditLog } from './audit-log';
import {
  AUDIT_LOG_WRITER,
  IAuditLogWriter,
} from './audit-log-writer.interface';

export interface SecurityAuditInfo {
  timestamp: Date;
  userId: string;
  userGroup?: string | null;
  clientId?: string | null;
  tokenUse?: string | null;
  userAgent: string;
  ipAddress: string;
  method: string;
  path: string;
  queryString: string;
  isAuthenticated: boolean;
  statusCode: number;
  durationMs: number;
  responseSize: number;
}

/**
 * Nest parity of C# SecurityAuditMiddleware — queues HttpRequest rows to IAuditLogWriter.
 */
@Injectable()
export class SecurityAuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityAuditMiddleware.name);

  constructor(
    @Inject(AUDIT_LOG_WRITER) private readonly auditLogWriter: IAuditLogWriter,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.path || req.url || '';
    if (isHealthPath(path) || path.toLowerCase().startsWith('/swagger')) {
      next();
      return;
    }

    const startTime = new Date();
    const started = Date.now();

    res.on('finish', () => {
      const auditInfo: SecurityAuditInfo = {
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
        isAuthenticated: !!(req as any).user,
        statusCode: res.statusCode,
        durationMs: Date.now() - started,
        responseSize: Number(res.getHeader('content-length') ?? 0),
      };

      this.logSecurityAudit(auditInfo);
      void this.queueSecurityAudit(req, auditInfo).catch((err) =>
        this.logger.error(`Security audit error for ${auditInfo.path}`, err as Error),
      );
    });

    next();
  }

  private async queueSecurityAudit(
    req: Request,
    auditInfo: SecurityAuditInfo,
  ): Promise<void> {
    const correlationId =
      header(req, 'x-correlation-id') ||
      header(req, 'x-request-id') ||
      randomUUID();

    const changeParts: string[] = [];
    if (auditInfo.tokenUse) changeParts.push(`token_use=${auditInfo.tokenUse}`);
    const clientApp = header(req, 'x-client-app');
    if (clientApp) changeParts.push(`client_app=${clientApp}`);

    const auditLog = createAuditLog({
      entityName: 'HttpRequest',
      entityId: correlationId,
      action: auditInfo.method,
      userId: auditInfo.userId,
      userName: (req as any).user?.name ?? (req as any).user?.username ?? null,
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

  private logSecurityAudit(auditInfo: SecurityAuditInfo): void {
    const msg =
      `Security Audit: ${auditInfo.method} ${auditInfo.path} - User: ${auditInfo.userId} - ` +
      `Group: ${auditInfo.userGroup ?? ''} - ClientId: ${auditInfo.clientId ?? ''} - ` +
      `IP: ${auditInfo.ipAddress} - Status: ${auditInfo.statusCode} - Duration: ${auditInfo.durationMs}ms`;

    if (auditInfo.statusCode >= 400) this.logger.warn(msg);
    else this.logger.log(msg);

    if (isCriticalSecurityEvent(auditInfo)) {
      this.logger.warn(`CRITICAL SECURITY EVENT: ${JSON.stringify(auditInfo)}`);
    }
  }
}

function header(req: Request, name: string): string {
  const value = req.headers[name];
  if (Array.isArray(value)) return (value[0] ?? '').trim();
  return String(value ?? '').trim();
}

function claim(req: Request, key: string): string {
  const user = (req as any).user;
  if (!user) return '';
  if (user[key] != null) return String(user[key]).trim();
  if (Array.isArray(user.claims)) {
    const found = user.claims.find((c: any) => c?.type === key || c?.Type === key);
    if (found?.value != null || found?.Value != null) return String(found.value ?? found.Value).trim();
  }
  return '';
}

function getUserId(req: Request): string {
  const fromHeader = header(req, 'x-user-id');
  if (fromHeader) return fromHeader;

  const user = (req as any).user;
  if (user?.id != null) return String(user.id);
  if (user?.sub != null) return String(user.sub);
  if (user?.userId != null) return String(user.userId);
  const nameId = claim(req, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier');
  if (nameId) return nameId;
  return 'anonymous';
}

function getUserGroup(req: Request): string | null {
  const fromHeader = header(req, 'x-permission-group');
  if (fromHeader) return fromHeader;
  const fromClaim =
    claim(req, 'PermissionGroupName') ||
    String((req as any).user?.PermissionGroupName ?? (req as any).user?.permissionGroupName ?? '').trim();
  return fromClaim || null;
}

function getClientId(req: Request): string | null {
  const fromHeader = header(req, 'x-client-id');
  if (fromHeader) return fromHeader;
  const fromClaim = claim(req, 'client_id') || claim(req, 'guest_client_id');
  return fromClaim || null;
}

function isCriticalSecurityEvent(auditInfo: SecurityAuditInfo): boolean {
  return (
    auditInfo.statusCode === 401 ||
    auditInfo.statusCode === 403 ||
    auditInfo.path.includes('/admin') ||
    auditInfo.path.includes('/api/auth')
  );
}

export function extractModuleName(path: string): string {
  if (!path?.trim()) return '';
  const segments = path.split('/').filter(Boolean);
  const apiIndex = segments.findIndex((s) => s.toLowerCase() === 'api');
  if (apiIndex >= 0 && apiIndex + 1 < segments.length) return segments[apiIndex + 1];
  return segments[0] ?? '';
}

/** Same skip as C# RateLimiting / Serilog RequestPath filter — /hc and /metrics must not fill AUDIT_LOGS. */
export function isHealthPath(path: string): boolean {
  const normalized = (path.split('?')[0] || '').replace(/\/+$/, '') || '/';
  const lower = normalized.toLowerCase();
  return (
    lower === '/hc' ||
    lower === '/health' ||
    lower === '/metrics' ||
    lower.endsWith('/hc') ||
    lower.endsWith('/health') ||
    lower.endsWith('/metrics')
  );
}
