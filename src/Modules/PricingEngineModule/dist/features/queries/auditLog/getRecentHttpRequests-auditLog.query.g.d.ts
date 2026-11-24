import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogGetRecentHttpRequestsResponseDto } from '../../../dto/auditLog.getRecentHttpRequests.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class GetRecentHttpRequestsAuditLogQuery {
    readonly pageNumber?: number | undefined;
    readonly pageSize?: number | undefined;
    constructor(pageNumber?: number | undefined, pageSize?: number | undefined);
}
export declare class GetRecentHttpRequestsAuditLogHandler implements IQueryHandler<GetRecentHttpRequestsAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: GetRecentHttpRequestsAuditLogQuery): Promise<Response<AuditLogGetRecentHttpRequestsResponseDto[]>>;
}
