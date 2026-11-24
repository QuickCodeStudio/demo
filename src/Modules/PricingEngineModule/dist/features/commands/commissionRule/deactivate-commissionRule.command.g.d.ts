import { ICommandHandler } from '@nestjs/cqrs';
import { CommissionRuleDeactivateRequestDto } from '../../../dto/commissionRule.deactivate.request.dto.g';
import { CommissionRuleRepository } from '../../../repositories/commissionRule.repository.g';
import { Response } from '@demo/common';
export declare class DeactivateCommissionRuleCommand {
    readonly commissionRuleId: number;
    readonly dto: CommissionRuleDeactivateRequestDto;
    constructor(commissionRuleId: number, dto: CommissionRuleDeactivateRequestDto);
}
export declare class DeactivateCommissionRuleHandler implements ICommandHandler<DeactivateCommissionRuleCommand> {
    private readonly repository;
    constructor(repository: CommissionRuleRepository);
    execute(command: DeactivateCommissionRuleCommand): Promise<Response<number>>;
}
