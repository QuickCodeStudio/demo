import { ICommandHandler } from '@nestjs/cqrs';
import { CommissionRuleDto } from '../../../dto/commissionRule.dto.g';
import { CommissionRuleRepository } from '../../../repositories/commissionRule.repository.g';
import { Response } from '@demo/common';
export declare class InsertCommissionRuleCommand {
    readonly dto: CommissionRuleDto;
    constructor(dto: CommissionRuleDto);
}
export declare class InsertCommissionRuleHandler implements ICommandHandler<InsertCommissionRuleCommand> {
    private readonly repository;
    constructor(repository: CommissionRuleRepository);
    execute(command: InsertCommissionRuleCommand): Promise<Response<CommissionRuleDto>>;
}
