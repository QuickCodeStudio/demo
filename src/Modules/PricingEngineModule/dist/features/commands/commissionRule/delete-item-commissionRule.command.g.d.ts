import { ICommandHandler } from '@nestjs/cqrs';
import { CommissionRuleRepository } from '../../../repositories/commissionRule.repository.g';
import { Response } from '@demo/common';
export declare class DeleteItemCommissionRuleCommand {
    readonly id: number;
    constructor(id: number);
}
export declare class DeleteItemCommissionRuleHandler implements ICommandHandler<DeleteItemCommissionRuleCommand> {
    private readonly repository;
    constructor(repository: CommissionRuleRepository);
    execute(command: DeleteItemCommissionRuleCommand): Promise<Response<boolean>>;
}
