import { AuditLogPayload } from './audit-log';
import { IAuditLogWriter } from './audit-log-writer.interface';
export declare class NullAuditLogWriter implements IAuditLogWriter {
    queueAuditLogAsync(_auditLog: AuditLogPayload): Promise<void>;
    queueAuditLogsAsync(_auditLogs: Iterable<AuditLogPayload>): Promise<void>;
}
