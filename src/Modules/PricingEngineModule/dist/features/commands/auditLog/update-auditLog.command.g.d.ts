import { ICommandHandler } from '@nestjs/cqrs';
import { UpdateAuditLogDto } from '../../../dto/update-auditLog.dto.g';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class UpdateAuditLogCommand {
    readonly id: string;
    readonly dto: UpdateAuditLogDto;
    constructor(id: string, dto: UpdateAuditLogDto);
}
export declare class UpdateAuditLogHandler implements ICommandHandler<UpdateAuditLogCommand> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(command: UpdateAuditLogCommand): Promise<Response<boolean>>;
}
