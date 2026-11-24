import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogStatsMonthlyHttpRequestsResponseDto } from '../../../dto/auditLog.statsMonthlyHttpRequests.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class StatsMonthlyHttpRequestsAuditLogQuery {
    constructor();
}
export declare class StatsMonthlyHttpRequestsAuditLogHandler implements IQueryHandler<StatsMonthlyHttpRequestsAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: StatsMonthlyHttpRequestsAuditLogQuery): Promise<Response<AuditLogStatsMonthlyHttpRequestsResponseDto>>;
}
