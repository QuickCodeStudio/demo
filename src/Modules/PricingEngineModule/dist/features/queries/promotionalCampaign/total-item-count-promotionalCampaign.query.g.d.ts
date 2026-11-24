import { IQueryHandler } from '@nestjs/cqrs';
import { PromotionalCampaignRepository } from '../../../repositories/promotionalCampaign.repository.g';
import { Response } from '@demo/common';
export declare class TotalItemCountPromotionalCampaignQuery {
}
export declare class TotalItemCountPromotionalCampaignHandler implements IQueryHandler<TotalItemCountPromotionalCampaignQuery> {
    private readonly repository;
    constructor(repository: PromotionalCampaignRepository);
    execute(_query: TotalItemCountPromotionalCampaignQuery): Promise<Response<number>>;
}
