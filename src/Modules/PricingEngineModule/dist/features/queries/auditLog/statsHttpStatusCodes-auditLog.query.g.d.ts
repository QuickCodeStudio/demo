import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogStatsHttpStatusCodesResponseDto } from '../../../dto/auditLog.statsHttpStatusCodes.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class StatsHttpStatusCodesAuditLogQuery {
    constructor();
}
export declare class StatsHttpStatusCodesAuditLogHandler implements IQueryHandler<StatsHttpStatusCodesAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: StatsHttpStatusCodesAuditLogQuery): Promise<Response<AuditLogStatsHttpStatusCodesResponseDto[]>>;
}
