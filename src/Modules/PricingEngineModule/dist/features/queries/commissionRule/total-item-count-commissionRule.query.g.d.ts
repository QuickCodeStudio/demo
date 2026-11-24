import { IQueryHandler } from '@nestjs/cqrs';
import { CommissionRuleRepository } from '../../../repositories/commissionRule.repository.g';
import { Response } from '@demo/common';
export declare class TotalItemCountCommissionRuleQuery {
}
export declare class TotalItemCountCommissionRuleHandler implements IQueryHandler<TotalItemCountCommissionRuleQuery> {
    private readonly repository;
    constructor(repository: CommissionRuleRepository);
    execute(_query: TotalItemCountCommissionRuleQuery): Promise<Response<number>>;
}
