import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogStatsDailyHttpRequestsByDayResponseDto } from '../../../dto/auditLog.statsDailyHttpRequestsByDay.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class StatsDailyHttpRequestsByDayAuditLogQuery {
    constructor();
}
export declare class StatsDailyHttpRequestsByDayAuditLogHandler implements IQueryHandler<StatsDailyHttpRequestsByDayAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: StatsDailyHttpRequestsByDayAuditLogQuery): Promise<Response<AuditLogStatsDailyHttpRequestsByDayResponseDto[]>>;
}
