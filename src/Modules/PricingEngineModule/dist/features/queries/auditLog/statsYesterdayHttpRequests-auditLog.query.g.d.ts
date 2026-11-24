import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogStatsYesterdayHttpRequestsResponseDto } from '../../../dto/auditLog.statsYesterdayHttpRequests.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class StatsYesterdayHttpRequestsAuditLogQuery {
    constructor();
}
export declare class StatsYesterdayHttpRequestsAuditLogHandler implements IQueryHandler<StatsYesterdayHttpRequestsAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: StatsYesterdayHttpRequestsAuditLogQuery): Promise<Response<AuditLogStatsYesterdayHttpRequestsResponseDto>>;
}
