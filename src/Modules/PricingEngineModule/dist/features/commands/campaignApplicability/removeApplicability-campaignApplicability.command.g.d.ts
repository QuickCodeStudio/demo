import { ICommandHandler } from '@nestjs/cqrs';
import { CampaignApplicabilityRepository } from '../../../repositories/campaignApplicability.repository.g';
import { Response } from '@demo/common';
import { RuleScope } from '../../../enums/ruleScope.enum.g';
export declare class RemoveApplicabilityCampaignApplicabilityCommand {
    readonly campaignApplicabilityCampaignId: number;
    readonly campaignApplicabilityScope: RuleScope;
    readonly campaignApplicabilityScopeId: number;
    constructor(campaignApplicabilityCampaignId: number, campaignApplicabilityScope: RuleScope, campaignApplicabilityScopeId: number);
}
export declare class RemoveApplicabilityCampaignApplicabilityHandler implements ICommandHandler<RemoveApplicabilityCampaignApplicabilityCommand> {
    private readonly repository;
    constructor(repository: CampaignApplicabilityRepository);
    execute(command: RemoveApplicabilityCampaignApplicabilityCommand): Promise<Response<number>>;
}
