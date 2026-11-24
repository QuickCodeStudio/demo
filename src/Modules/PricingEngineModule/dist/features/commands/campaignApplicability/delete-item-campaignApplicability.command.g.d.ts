import { ICommandHandler } from '@nestjs/cqrs';
import { CampaignApplicabilityRepository } from '../../../repositories/campaignApplicability.repository.g';
import { Response } from '@demo/common';
import { RuleScope } from '../../../enums/ruleScope.enum.g';
export declare class DeleteItemCampaignApplicabilityCommand {
    readonly campaignId: number;
    readonly scope: RuleScope;
    readonly scopeId: number;
    constructor(campaignId: number, scope: RuleScope, scopeId: number);
}
export declare class DeleteItemCampaignApplicabilityHandler implements ICommandHandler<DeleteItemCampaignApplicabilityCommand> {
    private readonly repository;
    constructor(repository: CampaignApplicabilityRepository);
    execute(command: DeleteItemCampaignApplicabilityCommand): Promise<Response<boolean>>;
}
