import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogStatsYearlyHttpRequestsResponseDto } from '../../../dto/auditLog.statsYearlyHttpRequests.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class StatsYearlyHttpRequestsAuditLogQuery {
    constructor();
}
export declare class StatsYearlyHttpRequestsAuditLogHandler implements IQueryHandler<StatsYearlyHttpRequestsAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: StatsYearlyHttpRequestsAuditLogQuery): Promise<Response<AuditLogStatsYearlyHttpRequestsResponseDto>>;
}
