import { IQueryHandler } from '@nestjs/cqrs';
import { CampaignApplicabilityDto } from '../../../dto/campaignApplicability.dto.g';
import { CampaignApplicabilityRepository } from '../../../repositories/campaignApplicability.repository.g';
import { Response, ListResult } from '@demo/common';
export declare class ListCampaignApplicabilityQuery {
    readonly page?: number | undefined;
    readonly size?: number | undefined;
    readonly includeCount: boolean;
    constructor(page?: number | undefined, size?: number | undefined, includeCount?: boolean);
}
export declare class ListCampaignApplicabilityHandler implements IQueryHandler<ListCampaignApplicabilityQuery> {
    private readonly repository;
    constructor(repository: CampaignApplicabilityRepository);
    execute(query: ListCampaignApplicabilityQuery): Promise<Response<ListResult<CampaignApplicabilityDto>>>;
}
