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
var BackgroundAuditLogWriter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackgroundAuditLogWriter = void 0;
exports.computeHash = computeHash;
exports.insertAuditSql = insertAuditSql;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const sql_loader_1 = require("../db/sql-loader");
const db_config_1 = require("../db/db-config");
const BATCH_SIZE = 100;
const MAX_QUEUE_SIZE = 10_000;
let BackgroundAuditLogWriter = BackgroundAuditLogWriter_1 = class BackgroundAuditLogWriter {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(BackgroundAuditLogWriter_1.name);
        this.queue = [];
        this.waiters = [];
        this.running = false;
        this.loopPromise = null;
    }
    onModuleInit() {
        if (process.env.SWAGGER_DUMP === '1')
            return;
        this.running = true;
        this.loopPromise = this.runLoop();
        this.logger.log('Audit Log Background Service started');
    }
    async onModuleDestroy() {
        this.running = false;
        this.releaseWaiters();
        if (this.loopPromise) {
            try {
                await this.loopPromise;
            }
            catch {
            }
        }
        await this.flushRemaining();
        this.logger.log('Audit Log Background Service stopped');
    }
    async queueAuditLogAsync(auditLog) {
        if (this.queue.length >= MAX_QUEUE_SIZE) {
            this.logger.warn(`Audit queue is full. Dropping audit log for ${auditLog.entityName}:${auditLog.entityId}`);
            return;
        }
        auditLog.hash = computeHash(auditLog);
        this.queue.push(auditLog);
        this.releaseWaiters();
    }
    async queueAuditLogsAsync(auditLogs) {
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
    releaseWaiters() {
        const waiters = this.waiters.splice(0);
        for (const w of waiters)
            w();
    }
    waitForSignal(ms = 5_000) {
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
    async runLoop() {
        while (this.running) {
            try {
                await this.waitForSignal();
                if (!this.running && this.queue.length === 0)
                    break;
                const batch = [];
                while (batch.length < BATCH_SIZE && this.queue.length > 0) {
                    const item = this.queue.shift();
                    if (item)
                        batch.push(item);
                }
                if (batch.length > 0)
                    await this.writeBatch(batch);
            }
            catch (err) {
                if (!this.running)
                    break;
                this.logger.error('Error processing audit logs', err);
                await new Promise((r) => setTimeout(r, 5_000));
            }
        }
    }
    async flushRemaining() {
        if (this.queue.length === 0)
            return;
        const remaining = this.queue.splice(0);
        this.logger.log(`Flushing ${remaining.length} remaining audit logs`);
        await this.writeBatch(remaining);
    }
    async writeBatch(batch) {
        const rawType = (process.env.DB_TYPE || '').trim();
        if (!rawType || rawType.toLowerCase() === 'inmemory')
            return;
        try {
            const dbType = (0, db_config_1.normalizeDbType)(rawType);
            for (const log of batch)
                coalesceNullableStringsForInsert(log);
            const sql = insertAuditSql(dbType);
            for (const log of batch) {
                const named = toNamedParams(log);
                const { text, params } = (0, sql_loader_1.bindNamedParamsMap)(sql, named, dbType);
                await this.dataSource.query(text, params);
            }
            this.logger.debug(`Successfully wrote ${batch.length} audit logs to database`);
        }
        catch (err) {
            this.logger.error(`Failed to write audit log batch. Batch size: ${batch.length}`, err);
            const first = batch[0];
            const msg = err instanceof Error ? err.message : String(err);
            if (first && !first.errorMessage?.includes('RETRY_')) {
                for (const log of batch) {
                    log.errorMessage = `RETRY_1: ${msg}`;
                    this.queue.push(log);
                }
                this.releaseWaiters();
            }
            else if (first?.errorMessage?.includes('RETRY_1')) {
                for (const log of batch) {
                    log.errorMessage = `RETRY_2: ${msg}`;
                    this.queue.push(log);
                }
                this.releaseWaiters();
            }
            else {
                this.logger.error(`AUDIT LOG LOST after retries: ${JSON.stringify(batch)}`);
            }
        }
    }
};
exports.BackgroundAuditLogWriter = BackgroundAuditLogWriter;
exports.BackgroundAuditLogWriter = BackgroundAuditLogWriter = BackgroundAuditLogWriter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], BackgroundAuditLogWriter);
function computeHash(auditLog) {
    const data = `${auditLog.entityName}|${auditLog.entityId}|${auditLog.action}|` +
        `${auditLog.userId ?? ''}|${auditLog.timestamp.toISOString()}|` +
        `${auditLog.oldValues ?? ''}|${auditLog.newValues ?? ''}`;
    return (0, crypto_1.createHash)('sha256').update(data, 'utf8').digest('base64');
}
function coalesceNullableStringsForInsert(log) {
    log.userId ??= '';
    log.userName ??= '';
    log.userGroup ??= '';
    log.oldValues ??= '';
    log.newValues ??= '';
    log.changedColumns ??= '';
    log.changeSummary ??= '';
    log.ipAddress ??= '';
    log.userAgent ??= '';
    log.correlationId ??= '';
    log.requestModule ??= '';
    log.requestPath ??= '';
    log.errorMessage ??= '';
    log.hash ??= '';
}
function toNamedParams(log) {
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
        CorrelationId: log.correlationId,
        IsSuccess: log.isSuccess,
        ErrorMessage: log.errorMessage,
        Hash: log.hash,
    };
}
function insertAuditSql(databaseType) {
    switch (databaseType) {
        case 'mssql':
            return `INSERT INTO [dbo].[AUDIT_LOGS] ([ID], [ENTITY_NAME], [ENTITY_ID], [ACTION], [USER_ID], [USER_NAME], [USER_GROUP], [TIMESTAMP], [DURATION_MS], [STATUS_CODE], [REQUEST_MODULE], [REQUEST_PATH], [OLD_VALUES], [NEW_VALUES], [CHANGED_COLUMNS], [IS_CHANGED], [CHANGE_SUMMARY], [IP_ADDRESS], [USER_AGENT], [CORRELATION_ID], [IS_SUCCESS], [ERROR_MESSAGE], [HASH])
VALUES (@Id, @EntityName, @EntityId, @Action, @UserId, @UserName, @UserGroup, @Timestamp, @DurationMs, @StatusCode, @RequestModule, @RequestPath, @OldValues, @NewValues, @ChangedColumns, @IsChanged, @ChangeSummary, @IpAddress, @UserAgent, @CorrelationId, @IsSuccess, @ErrorMessage, @Hash);`;
        case 'mysql':
            return `INSERT INTO \`AUDIT_LOGS\` (\`ID\`, \`ENTITY_NAME\`, \`ENTITY_ID\`, \`ACTION\`, \`USER_ID\`, \`USER_NAME\`, \`USER_GROUP\`, \`TIMESTAMP\`, \`DURATION_MS\`, \`STATUS_CODE\`, \`REQUEST_MODULE\`, \`REQUEST_PATH\`, \`OLD_VALUES\`, \`NEW_VALUES\`, \`CHANGED_COLUMNS\`, \`IS_CHANGED\`, \`CHANGE_SUMMARY\`, \`IP_ADDRESS\`, \`USER_AGENT\`, \`CORRELATION_ID\`, \`IS_SUCCESS\`, \`ERROR_MESSAGE\`, \`HASH\`)
VALUES (@Id, @EntityName, @EntityId, @Action, @UserId, @UserName, @UserGroup, @Timestamp, @DurationMs, @StatusCode, @RequestModule, @RequestPath, @OldValues, @NewValues, @ChangedColumns, @IsChanged, @ChangeSummary, @IpAddress, @UserAgent, @CorrelationId, @IsSuccess, @ErrorMessage, @Hash);`;
        default:
            return `INSERT INTO "AUDIT_LOGS" ("ID", "ENTITY_NAME", "ENTITY_ID", "ACTION", "USER_ID", "USER_NAME", "USER_GROUP", "TIMESTAMP", "DURATION_MS", "STATUS_CODE", "REQUEST_MODULE", "REQUEST_PATH", "OLD_VALUES", "NEW_VALUES", "CHANGED_COLUMNS", "IS_CHANGED", "CHANGE_SUMMARY", "IP_ADDRESS", "USER_AGENT", "CORRELATION_ID", "IS_SUCCESS", "ERROR_MESSAGE", "HASH")
VALUES (@Id, @EntityName, @EntityId, @Action, @UserId, @UserName, @UserGroup, @Timestamp, @DurationMs, @StatusCode, @RequestModule, @RequestPath, @OldValues, @NewValues, @ChangedColumns, @IsChanged, @ChangeSummary, @IpAddress, @UserAgent, @CorrelationId, @IsSuccess, @ErrorMessage, @Hash);`;
    }
}
//# sourceMappingURL=background-audit-log-writer.js.map