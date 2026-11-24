import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PromotionalCampaignDto } from '../dto/promotionalCampaign.dto.g';
import { PromotionalCampaignGetActiveCampaignsResponseDto } from '../dto/promotionalCampaign.getActiveCampaigns.response.dto.g';
import { PromotionalCampaignGetCampaignsInDateRangeResponseDto } from '../dto/promotionalCampaign.getCampaignsInDateRange.response.dto.g';
import { PromotionalCampaignDeactivateRequestDto } from '../dto/promotionalCampaign.deactivate.request.dto.g';
import { ListResult } from '@demo/common';
export declare class PromotionalCampaignsController {
    private readonly queryBus;
    private readonly commandBus;
    constructor(queryBus: QueryBus, commandBus: CommandBus);
    listAsync(page?: number, size?: number, includeCount?: boolean): Promise<ListResult<PromotionalCampaignDto>>;
    countAsync(): Promise<number>;
    getItemAsync(id: number): Promise<PromotionalCampaignDto>;
    insertAsync(dto: PromotionalCampaignDto): Promise<PromotionalCampaignDto>;
    updateAsync(id: number, dto: PromotionalCampaignDto): Promise<boolean>;
    deleteAsync(id: number): Promise<boolean>;
    getActiveCampaignsAsync(pageNumber?: number, pageSize?: number): Promise<PromotionalCampaignGetActiveCampaignsResponseDto[]>;
    getCampaignsInDateRangeAsync(startDate_From: Date, startDate_To: Date, pageNumber?: number, pageSize?: number): Promise<PromotionalCampaignGetCampaignsInDateRangeResponseDto[]>;
    deactivateAsync(promotionalCampaignId: number, dto: PromotionalCampaignDeactivateRequestDto): Promise<number>;
}
