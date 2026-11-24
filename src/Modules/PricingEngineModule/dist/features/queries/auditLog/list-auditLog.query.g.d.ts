import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogDto } from '../../../dto/auditLog.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response, ListResult } from '@demo/common';
export declare class ListAuditLogQuery {
    readonly page?: number | undefined;
    readonly size?: number | undefined;
    readonly includeCount: boolean;
    constructor(page?: number | undefined, size?: number | undefined, includeCount?: boolean);
}
export declare class ListAuditLogHandler implements IQueryHandler<ListAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: ListAuditLogQuery): Promise<Response<ListResult<AuditLogDto>>>;
}
