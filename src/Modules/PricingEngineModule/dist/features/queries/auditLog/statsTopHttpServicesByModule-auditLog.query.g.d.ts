import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogStatsTopHttpServicesByModuleResponseDto } from '../../../dto/auditLog.statsTopHttpServicesByModule.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class StatsTopHttpServicesByModuleAuditLogQuery {
    constructor();
}
export declare class StatsTopHttpServicesByModuleAuditLogHandler implements IQueryHandler<StatsTopHttpServicesByModuleAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: StatsTopHttpServicesByModuleAuditLogQuery): Promise<Response<AuditLogStatsTopHttpServicesByModuleResponseDto[]>>;
}
