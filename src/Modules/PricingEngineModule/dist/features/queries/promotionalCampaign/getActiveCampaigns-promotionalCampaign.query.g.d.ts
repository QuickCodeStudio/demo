import { IQueryHandler } from '@nestjs/cqrs';
import { PromotionalCampaignGetActiveCampaignsResponseDto } from '../../../dto/promotionalCampaign.getActiveCampaigns.response.dto.g';
import { PromotionalCampaignRepository } from '../../../repositories/promotionalCampaign.repository.g';
import { Response } from '@demo/common';
export declare class GetActiveCampaignsPromotionalCampaignQuery {
    readonly pageNumber?: number | undefined;
    readonly pageSize?: number | undefined;
    constructor(pageNumber?: number | undefined, pageSize?: number | undefined);
}
export declare class GetActiveCampaignsPromotionalCampaignHandler implements IQueryHandler<GetActiveCampaignsPromotionalCampaignQuery> {
    private readonly repository;
    constructor(repository: PromotionalCampaignRepository);
    execute(query: GetActiveCampaignsPromotionalCampaignQuery): Promise<Response<PromotionalCampaignGetActiveCampaignsResponseDto[]>>;
}
