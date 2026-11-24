import { IQueryHandler } from '@nestjs/cqrs';
import { CampaignApplicabilityGetByCampaignIdResponseDto } from '../../../dto/campaignApplicability.getByCampaignId.response.dto.g';
import { CampaignApplicabilityRepository } from '../../../repositories/campaignApplicability.repository.g';
import { Response } from '@demo/common';
export declare class GetByCampaignIdCampaignApplicabilityQuery {
    readonly campaignId: number;
    constructor(campaignId: number);
}
export declare class GetByCampaignIdCampaignApplicabilityHandler implements IQueryHandler<GetByCampaignIdCampaignApplicabilityQuery> {
    private readonly repository;
    constructor(repository: CampaignApplicabilityRepository);
    execute(query: GetByCampaignIdCampaignApplicabilityQuery): Promise<Response<CampaignApplicabilityGetByCampaignIdResponseDto[]>>;
}
