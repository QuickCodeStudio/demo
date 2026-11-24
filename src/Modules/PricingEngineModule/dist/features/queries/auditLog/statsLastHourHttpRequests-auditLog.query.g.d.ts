import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogStatsLastHourHttpRequestsResponseDto } from '../../../dto/auditLog.statsLastHourHttpRequests.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class StatsLastHourHttpRequestsAuditLogQuery {
    constructor();
}
export declare class StatsLastHourHttpRequestsAuditLogHandler implements IQueryHandler<StatsLastHourHttpRequestsAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: StatsLastHourHttpRequestsAuditLogQuery): Promise<Response<AuditLogStatsLastHourHttpRequestsResponseDto>>;
}
