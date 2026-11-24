import { IQueryHandler } from '@nestjs/cqrs';
import { CampaignApplicabilityDto } from '../../../dto/campaignApplicability.dto.g';
import { CampaignApplicabilityRepository } from '../../../repositories/campaignApplicability.repository.g';
import { Response } from '@demo/common';
import { RuleScope } from '../../../enums/ruleScope.enum.g';
export declare class GetItemCampaignApplicabilityQuery {
    readonly campaignId: number;
    readonly scope: RuleScope;
    readonly scopeId: number;
    constructor(campaignId: number, scope: RuleScope, scopeId: number);
}
export declare class GetItemCampaignApplicabilityHandler implements IQueryHandler<GetItemCampaignApplicabilityQuery> {
    private readonly repository;
    constructor(repository: CampaignApplicabilityRepository);
    execute(query: GetItemCampaignApplicabilityQuery): Promise<Response<CampaignApplicabilityDto>>;
}
