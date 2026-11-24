import { AuditLogPayload } from './audit-log';

export const AUDIT_LOG_WRITER = Symbol('AUDIT_LOG_WRITER');

export interface IAuditLogWriter {
  queueAuditLogAsync(auditLog: AuditLogPayload): Promise<void>;
  queueAuditLogsAsync(auditLogs: Iterable<AuditLogPayload>): Promise<void>;
}
