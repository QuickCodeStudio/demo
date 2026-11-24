import { IQueryHandler } from '@nestjs/cqrs';
import { CommissionRuleDto } from '../../../dto/commissionRule.dto.g';
import { CommissionRuleRepository } from '../../../repositories/commissionRule.repository.g';
import { Response, ListResult } from '@demo/common';
export declare class ListCommissionRuleQuery {
    readonly page?: number | undefined;
    readonly size?: number | undefined;
    readonly includeCount: boolean;
    constructor(page?: number | undefined, size?: number | undefined, includeCount?: boolean);
}
export declare class ListCommissionRuleHandler implements IQueryHandler<ListCommissionRuleQuery> {
    private readonly repository;
    constructor(repository: CommissionRuleRepository);
    execute(query: ListCommissionRuleQuery): Promise<Response<ListResult<CommissionRuleDto>>>;
}
