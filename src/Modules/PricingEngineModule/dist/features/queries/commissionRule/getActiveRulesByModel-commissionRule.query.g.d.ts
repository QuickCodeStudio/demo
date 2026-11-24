import { IQueryHandler } from '@nestjs/cqrs';
import { CommissionRuleGetActiveRulesByModelResponseDto } from '../../../dto/commissionRule.getActiveRulesByModel.response.dto.g';
import { CommissionRuleRepository } from '../../../repositories/commissionRule.repository.g';
import { Response } from '@demo/common';
export declare class GetActiveRulesByModelCommissionRuleQuery {
    readonly commissionModelId: number;
    readonly pageNumber?: number | undefined;
    readonly pageSize?: number | undefined;
    constructor(commissionModelId: number, pageNumber?: number | undefined, pageSize?: number | undefined);
}
export declare class GetActiveRulesByModelCommissionRuleHandler implements IQueryHandler<GetActiveRulesByModelCommissionRuleQuery> {
    private readonly repository;
    constructor(repository: CommissionRuleRepository);
    execute(query: GetActiveRulesByModelCommissionRuleQuery): Promise<Response<CommissionRuleGetActiveRulesByModelResponseDto[]>>;
}
