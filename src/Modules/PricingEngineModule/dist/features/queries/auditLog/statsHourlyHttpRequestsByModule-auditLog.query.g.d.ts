import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogStatsHourlyHttpRequestsByModuleResponseDto } from '../../../dto/auditLog.statsHourlyHttpRequestsByModule.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class StatsHourlyHttpRequestsByModuleAuditLogQuery {
    constructor();
}
export declare class StatsHourlyHttpRequestsByModuleAuditLogHandler implements IQueryHandler<StatsHourlyHttpRequestsByModuleAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: StatsHourlyHttpRequestsByModuleAuditLogQuery): Promise<Response<AuditLogStatsHourlyHttpRequestsByModuleResponseDto[]>>;
}
