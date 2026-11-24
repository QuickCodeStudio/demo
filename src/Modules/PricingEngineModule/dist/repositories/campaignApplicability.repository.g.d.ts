import { DataSource } from 'typeorm';
import { CampaignApplicabilityDto } from '../dto/campaignApplicability.dto.g';
import { UpdateCampaignApplicabilityDto } from '../dto/update-campaignApplicability.dto.g';
import { CampaignApplicabilityGetByCampaignIdResponseDto } from '../dto/campaignApplicability.getByCampaignId.response.dto.g';
import { ICampaignApplicabilityRepository } from './campaignApplicability.repository.interface.g';
import { RepoResponse } from '@demo/common';
import { RuleScope } from '../enums/ruleScope.enum.g';
export declare class CampaignApplicabilityRepository implements ICampaignApplicabilityRepository {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    listAsync(page?: number, size?: number): Promise<RepoResponse<CampaignApplicabilityDto[]>>;
    countAsync(): Promise<RepoResponse<number>>;
    getByPkAsync(campaignId: number, scope: RuleScope, scopeId: number): Promise<RepoResponse<CampaignApplicabilityDto>>;
    insertAsync(dto: CampaignApplicabilityDto): Promise<RepoResponse<CampaignApplicabilityDto>>;
    updateAsync(campaignId: number, scope: RuleScope, scopeId: number, dto: UpdateCampaignApplicabilityDto): Promise<RepoResponse<boolean>>;
    deleteAsync(campaignId: number, scope: RuleScope, scopeId: number): Promise<RepoResponse<boolean>>;
    getByCampaignIdAsync(campaignId: number): Promise<RepoResponse<CampaignApplicabilityGetByCampaignIdResponseDto[]>>;
    removeApplicabilityAsync(campaignApplicabilityCampaignId: number, campaignApplicabilityScope: RuleScope, campaignApplicabilityScopeId: number): Promise<RepoResponse<number>>;
    private toDto;
    private pick;
}
