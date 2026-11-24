import { IQueryHandler } from '@nestjs/cqrs';
import { CommissionRuleDto } from '../../../dto/commissionRule.dto.g';
import { CommissionRuleRepository } from '../../../repositories/commissionRule.repository.g';
import { Response } from '@demo/common';
export declare class GetItemCommissionRuleQuery {
    readonly id: number;
    constructor(id: number);
}
export declare class GetItemCommissionRuleHandler implements IQueryHandler<GetItemCommissionRuleQuery> {
    private readonly repository;
    constructor(repository: CommissionRuleRepository);
    execute(query: GetItemCommissionRuleQuery): Promise<Response<CommissionRuleDto>>;
}
