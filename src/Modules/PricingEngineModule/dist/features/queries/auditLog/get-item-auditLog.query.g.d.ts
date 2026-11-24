import { IQueryHandler } from '@nestjs/cqrs';
import { AuditLogDto } from '../../../dto/auditLog.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class GetItemAuditLogQuery {
    readonly id: string;
    constructor(id: string);
}
export declare class GetItemAuditLogHandler implements IQueryHandler<GetItemAuditLogQuery> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(query: GetItemAuditLogQuery): Promise<Response<AuditLogDto>>;
}
