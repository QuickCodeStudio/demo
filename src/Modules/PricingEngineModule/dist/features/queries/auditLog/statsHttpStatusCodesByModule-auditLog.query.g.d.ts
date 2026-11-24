import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogStatsHttpStatusCodesByModuleResponseDto } from '../../../dto/auditLog.statsHttpStatusCodesByModule.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class StatsHttpStatusCodesByModuleAuditLogQuery {
    constructor();
}
export declare class StatsHttpStatusCodesByModuleAuditLogHandler implements IQueryHandler<StatsHttpStatusCodesByModuleAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: StatsHttpStatusCodesByModuleAuditLogQuery): Promise<Response<AuditLogStatsHttpStatusCodesByModuleResponseDto[]>>;
}
