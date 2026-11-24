import { DataSource } from 'typeorm';
import { PromotionalCampaignDto } from '../dto/promotionalCampaign.dto.g';
import { UpdatePromotionalCampaignDto } from '../dto/update-promotionalCampaign.dto.g';
import { PromotionalCampaignGetActiveCampaignsResponseDto } from '../dto/promotionalCampaign.getActiveCampaigns.response.dto.g';
import { PromotionalCampaignGetCampaignsInDateRangeResponseDto } from '../dto/promotionalCampaign.getCampaignsInDateRange.response.dto.g';
import { PromotionalCampaignDeactivateRequestDto } from '../dto/promotionalCampaign.deactivate.request.dto.g';
import { IPromotionalCampaignRepository } from './promotionalCampaign.repository.interface.g';
import { RepoResponse } from '@demo/common';
export declare class PromotionalCampaignRepository implements IPromotionalCampaignRepository {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    listAsync(page?: number, size?: number): Promise<RepoResponse<PromotionalCampaignDto[]>>;
    countAsync(): Promise<RepoResponse<number>>;
    getByPkAsync(id: number): Promise<RepoResponse<PromotionalCampaignDto>>;
    insertAsync(dto: PromotionalCampaignDto): Promise<RepoResponse<PromotionalCampaignDto>>;
    updateAsync(id: number, dto: UpdatePromotionalCampaignDto): Promise<RepoResponse<boolean>>;
    deleteAsync(id: number): Promise<RepoResponse<boolean>>;
    getActiveCampaignsAsync(pageNumber?: number, pageSize?: number): Promise<RepoResponse<PromotionalCampaignGetActiveCampaignsResponseDto[]>>;
    getCampaignsInDateRangeAsync(startDate_From: Date, startDate_To: Date, pageNumber?: number, pageSize?: number): Promise<RepoResponse<PromotionalCampaignGetCampaignsInDateRangeResponseDto[]>>;
    deactivateAsync(promotionalCampaignId: number, dto: PromotionalCampaignDeactivateRequestDto): Promise<RepoResponse<number>>;
    private toDto;
    private pick;
}
