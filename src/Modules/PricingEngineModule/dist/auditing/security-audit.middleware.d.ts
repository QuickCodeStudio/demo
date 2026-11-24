import { NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { IAuditLogWriter } from './audit-log-writer.interface';
export interface SecurityAuditInfo {
    timestamp: Date;
    userId: string;
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
export declare class SecurityAuditMiddleware implements NestMiddleware {
    private readonly auditLogWriter;
    private readonly logger;
    constructor(auditLogWriter: IAuditLogWriter);
    use(req: Request, res: Response, next: NextFunction): void;
    private queueSecurityAudit;
    private logSecurityAudit;
}
export declare function extractModuleName(path: string): string;
export declare function isHealthPath(path: string): boolean;
