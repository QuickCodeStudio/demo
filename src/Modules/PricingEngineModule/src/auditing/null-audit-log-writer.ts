import { Injectable } from '@nestjs/common';
import { AuditLogPayload } from './audit-log';
import { IAuditLogWriter } from './audit-log-writer.interface';

/** Portal/Gateway-style no-op when a Nest host should not write AUDIT_LOGS. */
@Injectable()
export class NullAuditLogWriter implements IAuditLogWriter {
  queueAuditLogAsync(_auditLog: AuditLogPayload): Promise<void> {
    return Promise.resolve();
  }

  queueAuditLogsAsync(_auditLogs: Iterable<AuditLogPayload>): Promise<void> {
    return Promise.resolve();
  }
}
