import { IQueryHandler } from '@nestjs/cqrs';
import { PromotionalCampaignDto } from '../../../dto/promotionalCampaign.dto.g';
import { PromotionalCampaignRepository } from '../../../repositories/promotionalCampaign.repository.g';
import { Response } from '@demo/common';
export declare class GetItemPromotionalCampaignQuery {
    readonly id: number;
    constructor(id: number);
}
export declare class GetItemPromotionalCampaignHandler implements IQueryHandler<GetItemPromotionalCampaignQuery> {
    private readonly repository;
    constructor(repository: PromotionalCampaignRepository);
    execute(query: GetItemPromotionalCampaignQuery): Promise<Response<PromotionalCampaignDto>>;
}
