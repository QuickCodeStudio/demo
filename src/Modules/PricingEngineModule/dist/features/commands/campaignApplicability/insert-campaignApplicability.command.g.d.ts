import { ICommandHandler } from '@nestjs/cqrs';
import { CampaignApplicabilityDto } from '../../../dto/campaignApplicability.dto.g';
import { CampaignApplicabilityRepository } from '../../../repositories/campaignApplicability.repository.g';
import { Response } from '@demo/common';
export declare class InsertCampaignApplicabilityCommand {
    readonly dto: CampaignApplicabilityDto;
    constructor(dto: CampaignApplicabilityDto);
}
export declare class InsertCampaignApplicabilityHandler implements ICommandHandler<InsertCampaignApplicabilityCommand> {
    private readonly repository;
    constructor(repository: CampaignApplicabilityRepository);
    execute(command: InsertCampaignApplicabilityCommand): Promise<Response<CampaignApplicabilityDto>>;
}
