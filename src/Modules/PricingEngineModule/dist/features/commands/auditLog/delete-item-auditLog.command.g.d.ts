import { ICommandHandler } from '@nestjs/cqrs';
import { AuditLogRepository } from '../../../repositories/auditLog.repository.g';
import { Response } from '@demo/common';
export declare class DeleteItemAuditLogCommand {
    readonly id: string;
    constructor(id: string);
}
export declare class DeleteItemAuditLogHandler implements ICommandHandler<DeleteItemAuditLogCommand> {
    private readonly repository;
    constructor(repository: AuditLogRepository);
    execute(command: DeleteItemAuditLogCommand): Promise<Response<boolean>>;
}
