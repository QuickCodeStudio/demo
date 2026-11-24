import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogGetRecentHttpRequestsByModuleResponseDto } from '../../../dto/auditLog.getRecentHttpRequestsByModule.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class GetRecentHttpRequestsByModuleAuditLogQuery {
    readonly requestModule: string;
    readonly pageNumber?: number | undefined;
    readonly pageSize?: number | undefined;
    constructor(requestModule: string, pageNumber?: number | undefined, pageSize?: number | undefined);
}
export declare class GetRecentHttpRequestsByModuleAuditLogHandler implements IQueryHandler<GetRecentHttpRequestsByModuleAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: GetRecentHttpRequestsByModuleAuditLogQuery): Promise<Response<AuditLogGetRecentHttpRequestsByModuleResponseDto[]>>;
}
