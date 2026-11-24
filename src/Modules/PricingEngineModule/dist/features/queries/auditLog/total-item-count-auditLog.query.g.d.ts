import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class TotalItemCountAuditLogQuery {
}
export declare class TotalItemCountAuditLogHandler implements IQueryHandler<TotalItemCountAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(_query: TotalItemCountAuditLogQuery): Promise<Response<number>>;
}
