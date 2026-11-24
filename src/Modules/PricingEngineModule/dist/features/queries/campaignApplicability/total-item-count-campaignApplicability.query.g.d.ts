import { IQueryHandler } from '@nestjs/cqrs';
import { CampaignApplicabilityRepository } from '../../../repositories/campaignApplicability.repository.g';
import { Response } from '@demo/common';
export declare class TotalItemCountCampaignApplicabilityQuery {
}
export declare class TotalItemCountCampaignApplicabilityHandler implements IQueryHandler<TotalItemCountCampaignApplicabilityQuery> {
    private readonly repository;
    constructor(repository: CampaignApplicabilityRepository);
    execute(_query: TotalItemCountCampaignApplicabilityQuery): Promise<Response<number>>;
}
