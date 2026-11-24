import { Global, Module } from '@nestjs/common';
import { AUDIT_LOG_WRITER } from './audit-log-writer.interface';
import { BackgroundAuditLogWriter } from './background-audit-log-writer';
import { SecurityAuditMiddleware } from './security-audit.middleware';

/**
 * Nest parity of C# AddBankingGradeAuditing —
 * registers background writer + security audit middleware.
 */
@Global()
@Module({
  providers: [
    BackgroundAuditLogWriter,
    { provide: AUDIT_LOG_WRITER, useExisting: BackgroundAuditLogWriter },
    SecurityAuditMiddleware,
  ],
  exports: [AUDIT_LOG_WRITER, BackgroundAuditLogWriter, SecurityAuditMiddleware],
})
export class AuditingModule {}
