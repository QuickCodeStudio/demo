import { ICommandHandler } from '@nestjs/cqrs';
import { UpdateCommissionRuleDto } from '../../../dto/update-commissionRule.dto.g';
import { CommissionRuleRepository } from '../../../repositories/commissionRule.repository.g';
import { Response } from '@demo/common';
export declare class UpdateCommissionRuleCommand {
    readonly id: number;
    readonly dto: UpdateCommissionRuleDto;
    constructor(id: number, dto: UpdateCommissionRuleDto);
}
export declare class UpdateCommissionRuleHandler implements ICommandHandler<UpdateCommissionRuleCommand> {
    private readonly repository;
    constructor(repository: CommissionRuleRepository);
    execute(command: UpdateCommissionRuleCommand): Promise<Response<boolean>>;
}
