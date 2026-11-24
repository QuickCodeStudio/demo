import { createHash } from 'crypto';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { bindNamedParamsMap } from '../db/sql-loader';
import { normalizeDbType, QuickCodeDbType } from '../db/db-config';
import { AuditLogPayload } from './audit-log';
import { IAuditLogWriter } from './audit-log-writer.interface';

const BATCH_SIZE = 100;
const MAX_QUEUE_SIZE = 10_000;

/**
 * Nest parity of C# BackgroundAuditLogWriter — async queue + batch INSERT into AUDIT_LOGS.
 */
@Injectable()
export class BackgroundAuditLogWriter
  implements IAuditLogWriter, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(BackgroundAuditLogWriter.name);
  private readonly queue: AuditLogPayload[] = [];
  private waiters: Array<() => void> = [];
  private running = false;
  private loopPromise: Promise<void> | null = null;

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit(): void {
    if (process.env.SWAGGER_DUMP === '1') return;
    this.running = true;
    this.loopPromise = this.runLoop();
    this.logger.log('Audit Log Background Service started');
  }

  async onModuleDestroy(): Promise<void> {
    this.running = false;
    this.releaseWaiters();
    if (this.loopPromise) {
      try {
        await this.loopPromise;
      } catch {
        /* ignore */
      }
    }
    await this.flushRemaining();
    this.logger.log('Audit Log Background Service stopped');
  }

  async queueAuditLogAsync(auditLog: AuditLogPayload): Promise<void> {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.logger.warn(
        `Audit queue is full. Dropping audit log for ${auditLog.entityName}:${auditLog.entityId}`,
      );
      return;
    }
    auditLog.hash = computeHash(auditLog);
    this.queue.push(auditLog);
    this.releaseWaiters();
  }

  async queueAuditLogsAsync(auditLogs: Iterable<AuditLogPayload>): Promise<void> {
    for (const auditLog of auditLogs) {
      if (this.queue.length >= MAX_QUEUE_SIZE) {
        this.logger.warn('Audit queue is full. Stopping batch enqueue.');
        break;
      }
      auditLog.hash = computeHash(auditLog);
      this.queue.push(auditLog);
    }
    this.releaseWaiters();
  }

  private releaseWaiters(): void {
    const waiters = this.waiters.splice(0);
    for (const w of waiters) w();
  }

  private waitForSignal(ms = 5_000): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== onSignal);
        resolve();
      }, ms);
      const onSignal = () => {
        clearTimeout(timer);
        resolve();
      };
      this.waiters.push(onSignal);
    });
  }

  private async runLoop(): Promise<void> {
    while (this.running) {
      try {
        await this.waitForSignal();
        if (!this.running && this.queue.length === 0) break;

        const batch: AuditLogPayload[] = [];
        while (batch.length < BATCH_SIZE && this.queue.length > 0) {
          const item = this.queue.shift();
          if (item) batch.push(item);
        }
        if (batch.length > 0) await this.writeBatch(batch);
      } catch (err) {
        if (!this.running) break;
        this.logger.error('Error processing audit logs', err as Error);
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }
  }

  private async flushRemaining(): Promise<void> {
    if (this.queue.length === 0) return;
    const remaining = this.queue.splice(0);
    this.logger.log(`Flushing ${remaining.length} remaining audit logs`);
    await this.writeBatch(remaining);
  }

  private async writeBatch(batch: AuditLogPayload[]): Promise<void> {
    const rawType = (process.env.DB_TYPE || '').trim();
    if (!rawType || rawType.toLowerCase() === 'inmemory') return;

    try {
      const dbType = normalizeDbType(rawType);
      await ensureClientIdColumn(this.dataSource, dbType, this.logger);
      for (const log of batch) coalesceNullableStringsForInsert(log);

      const sql = insertAuditSql(dbType);
      for (const log of batch) {
        const named = toNamedParams(log);
        const { text, params } = bindNamedParamsMap(sql, named, dbType);
        await this.dataSource.query(text, params);
      }
      this.logger.debug(`Successfully wrote ${batch.length} audit logs to database`);
    } catch (err) {
      this.logger.error(
        `Failed to write audit log batch. Batch size: ${batch.length}`,
        err as Error,
      );
      const first = batch[0];
      const msg = err instanceof Error ? err.message : String(err);
      if (first && !first.errorMessage?.includes('RETRY_')) {
        for (const log of batch) {
          log.errorMessage = `RETRY_1: ${msg}`;
          this.queue.push(log);
        }
        this.releaseWaiters();
      } else if (first?.errorMessage?.includes('RETRY_1')) {
        for (const log of batch) {
          log.errorMessage = `RETRY_2: ${msg}`;
          this.queue.push(log);
        }
        this.releaseWaiters();
      } else {
        this.logger.error(`AUDIT LOG LOST after retries: ${JSON.stringify(batch)}`);
      }
    }
  }
}

export function computeHash(auditLog: AuditLogPayload): string {
  const data =
    `${auditLog.entityName}|${auditLog.entityId}|${auditLog.action}|` +
    `${auditLog.userId ?? ''}|${auditLog.timestamp.toISOString()}|` +
    `${auditLog.oldValues ?? ''}|${auditLog.newValues ?? ''}`;
  return createHash('sha256').update(data, 'utf8').digest('base64');
}

function coalesceNullableStringsForInsert(log: AuditLogPayload): void {
  log.userId ??= '';
  log.userName ??= '';
  log.userGroup ??= '';
  log.oldValues ??= '';
  log.newValues ??= '';
  log.changedColumns ??= '';
  log.changeSummary ??= '';
  log.ipAddress ??= '';
  log.userAgent ??= '';
  log.clientId ??= '';
  log.correlationId ??= '';
  log.requestModule ??= '';
  log.requestPath ??= '';
  log.errorMessage ??= '';
  log.hash ??= '';
}

function toNamedParams(log: AuditLogPayload): Record<string, unknown> {
  return {
    Id: log.id,
    EntityName: log.entityName,
    EntityId: log.entityId,
    Action: log.action,
    UserId: log.userId,
    UserName: log.userName,
    UserGroup: log.userGroup,
    Timestamp: log.timestamp,
    DurationMs: log.durationMs,
    StatusCode: log.statusCode,
    RequestModule: log.requestModule,
    RequestPath: log.requestPath,
    OldValues: log.oldValues,
    NewValues: log.newValues,
    ChangedColumns: log.changedColumns,
    IsChanged: log.isChanged,
    ChangeSummary: log.changeSummary,
    IpAddress: log.ipAddress,
    UserAgent: log.userAgent,
    ClientId: log.clientId,
    CorrelationId: log.correlationId,
    IsSuccess: log.isSuccess,
    ErrorMessage: log.errorMessage,
    Hash: log.hash,
  };
}

let clientIdColumnReady = false;

async function ensureClientIdColumn(
  dataSource: DataSource,
  databaseType: QuickCodeDbType,
  logger: Logger,
): Promise<void> {
  if (clientIdColumnReady) return;
  try {
    let sql: string | null = null;
    switch (databaseType) {
      case 'mssql':
        sql = `IF COL_LENGTH('dbo.AUDIT_LOGS', 'CLIENT_ID') IS NULL ALTER TABLE [dbo].[AUDIT_LOGS] ADD [CLIENT_ID] nvarchar(100) NULL;`;
        break;
      case 'mysql':
        sql = `ALTER TABLE \`AUDIT_LOGS\` ADD COLUMN IF NOT EXISTS \`CLIENT_ID\` varchar(100) NULL;`;
        break;
      default:
        sql = `ALTER TABLE "AUDIT_LOGS" ADD COLUMN IF NOT EXISTS "CLIENT_ID" varchar(100) NULL;`;
        break;
    }
    if (sql) await dataSource.query(sql);
    clientIdColumnReady = true;
  } catch (err) {
    logger.warn(`Could not ensure AUDIT_LOGS.CLIENT_ID column; continuing without alter. ${err}`);
  }
}

export function insertAuditSql(databaseType: QuickCodeDbType): string {
  switch (databaseType) {
    case 'mssql':
      return `INSERT INTO [dbo].[AUDIT_LOGS] ([ID], [ENTITY_NAME], [ENTITY_ID], [ACTION], [USER_ID], [USER_NAME], [USER_GROUP], [TIMESTAMP], [DURATION_MS], [STATUS_CODE], [REQUEST_MODULE], [REQUEST_PATH], [OLD_VALUES], [NEW_VALUES], [CHANGED_COLUMNS], [IS_CHANGED], [CHANGE_SUMMARY], [IP_ADDRESS], [USER_AGENT], [CLIENT_ID], [CORRELATION_ID], [IS_SUCCESS], [ERROR_MESSAGE], [HASH])
VALUES (@Id, @EntityName, @EntityId, @Action, @UserId, @UserName, @UserGroup, @Timestamp, @DurationMs, @StatusCode, @RequestModule, @RequestPath, @OldValues, @NewValues, @ChangedColumns, @IsChanged, @ChangeSummary, @IpAddress, @UserAgent, @ClientId, @CorrelationId, @IsSuccess, @ErrorMessage, @Hash);`;
    case 'mysql':
      return `INSERT INTO \`AUDIT_LOGS\` (\`ID\`, \`ENTITY_NAME\`, \`ENTITY_ID\`, \`ACTION\`, \`USER_ID\`, \`USER_NAME\`, \`USER_GROUP\`, \`TIMESTAMP\`, \`DURATION_MS\`, \`STATUS_CODE\`, \`REQUEST_MODULE\`, \`REQUEST_PATH\`, \`OLD_VALUES\`, \`NEW_VALUES\`, \`CHANGED_COLUMNS\`, \`IS_CHANGED\`, \`CHANGE_SUMMARY\`, \`IP_ADDRESS\`, \`USER_AGENT\`, \`CLIENT_ID\`, \`CORRELATION_ID\`, \`IS_SUCCESS\`, \`ERROR_MESSAGE\`, \`HASH\`)
VALUES (@Id, @EntityName, @EntityId, @Action, @UserId, @UserName, @UserGroup, @Timestamp, @DurationMs, @StatusCode, @RequestModule, @RequestPath, @OldValues, @NewValues, @ChangedColumns, @IsChanged, @ChangeSummary, @IpAddress, @UserAgent, @ClientId, @CorrelationId, @IsSuccess, @ErrorMessage, @Hash);`;
    default:
      return `INSERT INTO "AUDIT_LOGS" ("ID", "ENTITY_NAME", "ENTITY_ID", "ACTION", "USER_ID", "USER_NAME", "USER_GROUP", "TIMESTAMP", "DURATION_MS", "STATUS_CODE", "REQUEST_MODULE", "REQUEST_PATH", "OLD_VALUES", "NEW_VALUES", "CHANGED_COLUMNS", "IS_CHANGED", "CHANGE_SUMMARY", "IP_ADDRESS", "USER_AGENT", "CLIENT_ID", "CORRELATION_ID", "IS_SUCCESS", "ERROR_MESSAGE", "HASH")
VALUES (@Id, @EntityName, @EntityId, @Action, @UserId, @UserName, @UserGroup, @Timestamp, @DurationMs, @StatusCode, @RequestModule, @RequestPath, @OldValues, @NewValues, @ChangedColumns, @IsChanged, @ChangeSummary, @IpAddress, @UserAgent, @ClientId, @CorrelationId, @IsSuccess, @ErrorMessage, @Hash);`;
  }
}
