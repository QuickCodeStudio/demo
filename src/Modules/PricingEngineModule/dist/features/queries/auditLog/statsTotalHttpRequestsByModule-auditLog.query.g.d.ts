import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogStatsTotalHttpRequestsByModuleResponseDto } from '../../../dto/auditLog.statsTotalHttpRequestsByModule.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class StatsTotalHttpRequestsByModuleAuditLogQuery {
    constructor();
}
export declare class StatsTotalHttpRequestsByModuleAuditLogHandler implements IQueryHandler<StatsTotalHttpRequestsByModuleAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: StatsTotalHttpRequestsByModuleAuditLogQuery): Promise<Response<AuditLogStatsTotalHttpRequestsByModuleResponseDto[]>>;
}
