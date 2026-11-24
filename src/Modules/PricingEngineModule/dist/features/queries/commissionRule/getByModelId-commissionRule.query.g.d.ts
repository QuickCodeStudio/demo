import { IQueryHandler } from '@nestjs/cqrs';
import { CommissionRuleGetByModelIdResponseDto } from '../../../dto/commissionRule.getByModelId.response.dto.g';
import { CommissionRuleRepository } from '../../../repositories/commissionRule.repository.g';
import { Response } from '@demo/common';
export declare class GetByModelIdCommissionRuleQuery {
    readonly commissionModelId: number;
    readonly pageNumber?: number | undefined;
    readonly pageSize?: number | undefined;
    constructor(commissionModelId: number, pageNumber?: number | undefined, pageSize?: number | undefined);
}
export declare class GetByModelIdCommissionRuleHandler implements IQueryHandler<GetByModelIdCommissionRuleQuery> {
    private readonly repository;
    constructor(repository: CommissionRuleRepository);
    execute(query: GetByModelIdCommissionRuleQuery): Promise<Response<CommissionRuleGetByModelIdResponseDto[]>>;
}
