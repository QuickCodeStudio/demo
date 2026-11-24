import { ICommandHandler } from '@nestjs/cqrs';
import { AuditLogDto } from '../../../dto/auditLog.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class InsertAuditLogCommand {
    readonly dto: AuditLogDto;
    constructor(dto: AuditLogDto);
}
export declare class InsertAuditLogHandler implements ICommandHandler<InsertAuditLogCommand> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(command: InsertAuditLogCommand): Promise<Response<AuditLogDto>>;
}
