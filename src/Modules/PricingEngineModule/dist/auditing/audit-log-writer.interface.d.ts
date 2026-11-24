import { AuditLogPayload } from './audit-log';
export declare const AUDIT_LOG_WRITER: unique symbol;
export interface IAuditLogWriter {
    queueAuditLogAsync(auditLog: AuditLogPayload): Promise<void>;
    queueAuditLogsAsync(auditLogs: Iterable<AuditLogPayload>): Promise<void>;
}
