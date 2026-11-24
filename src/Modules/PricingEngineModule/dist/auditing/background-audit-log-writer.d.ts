import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QuickCodeDbType } from '../db/db-config';
import { AuditLogPayload } from './audit-log';
import { IAuditLogWriter } from './audit-log-writer.interface';
export declare class BackgroundAuditLogWriter implements IAuditLogWriter, OnModuleInit, OnModuleDestroy {
    private readonly dataSource;
    private readonly logger;
    private readonly queue;
    private waiters;
    private running;
    private loopPromise;
    constructor(dataSource: DataSource);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    queueAuditLogAsync(auditLog: AuditLogPayload): Promise<void>;
    queueAuditLogsAsync(auditLogs: Iterable<AuditLogPayload>): Promise<void>;
    private releaseWaiters;
    private waitForSignal;
    private runLoop;
    private flushRemaining;
    private writeBatch;
}
export declare function computeHash(auditLog: AuditLogPayload): string;
export declare function insertAuditSql(databaseType: QuickCodeDbType): string;
