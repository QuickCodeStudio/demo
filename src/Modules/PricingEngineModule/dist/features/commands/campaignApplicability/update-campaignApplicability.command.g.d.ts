import { ICommandHandler } from '@nestjs/cqrs';
import { UpdateCampaignApplicabilityDto } from '../../../dto/update-campaignApplicability.dto.g';
import { CampaignApplicabilityRepository } from '../../../repositories/campaignApplicability.repository.g';
import { Response } from '@demo/common';
import { RuleScope } from '../../../enums/ruleScope.enum.g';
export declare class UpdateCampaignApplicabilityCommand {
    readonly campaignId: number;
    readonly scope: RuleScope;
    readonly scopeId: number;
    readonly dto: UpdateCampaignApplicabilityDto;
    constructor(campaignId: number, scope: RuleScope, scopeId: number, dto: UpdateCampaignApplicabilityDto);
}
export declare class UpdateCampaignApplicabilityHandler implements ICommandHandler<UpdateCampaignApplicabilityCommand> {
    private readonly repository;
    constructor(repository: CampaignApplicabilityRepository);
    execute(command: UpdateCampaignApplicabilityCommand): Promise<Response<boolean>>;
}
