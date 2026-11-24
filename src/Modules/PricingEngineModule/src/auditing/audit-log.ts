import { randomUUID } from 'crypto';

/**
 * Payload for BackgroundAuditLogWriter (C# AuditLog parity).
 * Table AUDIT_LOGS comes from AuditLog.dbml migrations — not TypeORM synchronize.
 */
export interface AuditLogPayload {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  userId?: string | null;
  userName?: string | null;
  userGroup?: string | null;
  timestamp: Date;
  durationMs?: number | null;
  statusCode?: number | null;
  requestModule?: string | null;
  requestPath?: string | null;
  oldValues?: string | null;
  newValues?: string | null;
  changedColumns?: string | null;
  isChanged: boolean;
  changeSummary?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  clientId?: string | null;
  correlationId?: string | null;
  isSuccess: boolean;
  errorMessage?: string | null;
  hash?: string | null;
}

export function createAuditLog(partial: Partial<AuditLogPayload> & Pick<AuditLogPayload, 'entityName' | 'entityId' | 'action' | 'timestamp'>): AuditLogPayload {
  return {
    id: partial.id ?? randomUUID(),
    entityName: partial.entityName,
    entityId: partial.entityId,
    action: partial.action,
    userId: partial.userId ?? null,
    userName: partial.userName ?? null,
    userGroup: partial.userGroup ?? null,
    timestamp: partial.timestamp,
    durationMs: partial.durationMs ?? null,
    statusCode: partial.statusCode ?? null,
    requestModule: partial.requestModule ?? null,
    requestPath: partial.requestPath ?? null,
    oldValues: partial.oldValues ?? null,
    newValues: partial.newValues ?? null,
    changedColumns: partial.changedColumns ?? null,
    isChanged: partial.isChanged ?? false,
    changeSummary: partial.changeSummary ?? null,
    ipAddress: partial.ipAddress ?? null,
    userAgent: partial.userAgent ?? null,
    clientId: partial.clientId ?? null,
    correlationId: partial.correlationId ?? null,
    isSuccess: partial.isSuccess ?? true,
    errorMessage: partial.errorMessage ?? null,
    hash: partial.hash ?? null,
  };
}
