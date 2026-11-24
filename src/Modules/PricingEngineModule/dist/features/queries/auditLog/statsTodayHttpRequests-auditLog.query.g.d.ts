import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogStatsTodayHttpRequestsResponseDto } from '../../../dto/auditLog.statsTodayHttpRequests.response.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class StatsTodayHttpRequestsAuditLogQuery {
    constructor();
}
export declare class StatsTodayHttpRequestsAuditLogHandler implements IQueryHandler<StatsTodayHttpRequestsAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: StatsTodayHttpRequestsAuditLogQuery): Promise<Response<AuditLogStatsTodayHttpRequestsResponseDto>>;
}
