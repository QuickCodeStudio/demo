import { IQueryHandler } from '@nestjs/cqrs';
import { PromotionalCampaignDto } from '../../../dto/promotionalCampaign.dto.g';
import { PromotionalCampaignRepository } from '../../../repositories/promotionalCampaign.repository.g';
import { Response, ListResult } from '@demo/common';
export declare class ListPromotionalCampaignQuery {
    readonly page?: number | undefined;
    readonly size?: number | undefined;
    readonly includeCount: boolean;
    constructor(page?: number | undefined, size?: number | undefined, includeCount?: boolean);
}
export declare class ListPromotionalCampaignHandler implements IQueryHandler<ListPromotionalCampaignQuery> {
    private readonly repository;
    constructor(repository: PromotionalCampaignRepository);
    execute(query: ListPromotionalCampaignQuery): Promise<Response<ListResult<PromotionalCampaignDto>>>;
}
