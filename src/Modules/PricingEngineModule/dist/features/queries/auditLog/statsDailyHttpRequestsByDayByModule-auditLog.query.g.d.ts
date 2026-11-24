import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogStatsDailyHttpRequestsByDayByModuleResponseDto } from '../../../dto/auditLog.statsDailyHttpRequestsByDayByModule.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class StatsDailyHttpRequestsByDayByModuleAuditLogQuery {
    constructor();
}
export declare class StatsDailyHttpRequestsByDayByModuleAuditLogHandler implements IQueryHandler<StatsDailyHttpRequestsByDayByModuleAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: StatsDailyHttpRequestsByDayByModuleAuditLogQuery): Promise<Response<AuditLogStatsDailyHttpRequestsByDayByModuleResponseDto[]>>;
}
