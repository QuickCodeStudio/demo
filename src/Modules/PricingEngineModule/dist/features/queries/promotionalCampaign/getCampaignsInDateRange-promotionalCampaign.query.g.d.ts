import { IQueryHandler } from '@nestjs/cqrs';
import { PromotionalCampaignGetCampaignsInDateRangeResponseDto } from '../../../dto/promotionalCampaign.getCampaignsInDateRange.response.dto.g';
import { PromotionalCampaignRepository } from '../../../repositories/promotionalCampaign.repository.g';
import { Response } from '@demo/common';
export declare class GetCampaignsInDateRangePromotionalCampaignQuery {
    readonly startDate_From: Date;
    readonly startDate_To: Date;
    readonly pageNumber?: number | undefined;
    readonly pageSize?: number | undefined;
    constructor(startDate_From: Date, startDate_To: Date, pageNumber?: number | undefined, pageSize?: number | undefined);
}
export declare class GetCampaignsInDateRangePromotionalCampaignHandler implements IQueryHandler<GetCampaignsInDateRangePromotionalCampaignQuery> {
    private readonly repository;
    constructor(repository: PromotionalCampaignRepository);
    execute(query: GetCampaignsInDateRangePromotionalCampaignQuery): Promise<Response<PromotionalCampaignGetCampaignsInDateRangeResponseDto[]>>;
}
