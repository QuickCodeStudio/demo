import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogStatsHttpStatusCodesLast24HoursByModuleResponseDto } from '../../../dto/auditLog.statsHttpStatusCodesLast24HoursByModule.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class StatsHttpStatusCodesLast24HoursByModuleAuditLogQuery {
    constructor();
}
export declare class StatsHttpStatusCodesLast24HoursByModuleAuditLogHandler implements IQueryHandler<StatsHttpStatusCodesLast24HoursByModuleAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: StatsHttpStatusCodesLast24HoursByModuleAuditLogQuery): Promise<Response<AuditLogStatsHttpStatusCodesLast24HoursByModuleResponseDto[]>>;
}
