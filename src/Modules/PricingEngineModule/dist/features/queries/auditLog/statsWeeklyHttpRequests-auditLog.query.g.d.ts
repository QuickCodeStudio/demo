import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogStatsWeeklyHttpRequestsResponseDto } from '../../../dto/auditLog.statsWeeklyHttpRequests.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class StatsWeeklyHttpRequestsAuditLogQuery {
    constructor();
}
export declare class StatsWeeklyHttpRequestsAuditLogHandler implements IQueryHandler<StatsWeeklyHttpRequestsAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: StatsWeeklyHttpRequestsAuditLogQuery): Promise<Response<AuditLogStatsWeeklyHttpRequestsResponseDto>>;
}
