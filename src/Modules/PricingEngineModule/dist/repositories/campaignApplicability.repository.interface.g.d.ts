import { CampaignApplicabilityDto } from '../dto/campaignApplicability.dto.g';
import { UpdateCampaignApplicabilityDto } from '../dto/update-campaignApplicability.dto.g';
import { CampaignApplicabilityGetByCampaignIdResponseDto } from '../dto/campaignApplicability.getByCampaignId.response.dto.g';
import { RepoResponse } from '@demo/common';
import { RuleScope } from '../enums/ruleScope.enum.g';
export interface ICampaignApplicabilityRepository {
    listAsync(page?: number, size?: number): Promise<RepoResponse<CampaignApplicabilityDto[]>>;
    countAsync(): Promise<RepoResponse<number>>;
    getByPkAsync(campaignId: number, scope: RuleScope, scopeId: number): Promise<RepoResponse<CampaignApplicabilityDto>>;
    insertAsync(dto: CampaignApplicabilityDto): Promise<RepoResponse<CampaignApplicabilityDto>>;
    updateAsync(campaignId: number, scope: RuleScope, scopeId: number, dto: UpdateCampaignApplicabilityDto): Promise<RepoResponse<boolean>>;
    deleteAsync(campaignId: number, scope: RuleScope, scopeId: number): Promise<RepoResponse<boolean>>;
    getByCampaignIdAsync(campaignId: number): Promise<RepoResponse<CampaignApplicabilityGetByCampaignIdResponseDto[]>>;
    removeApplicabilityAsync(campaignApplicabilityCampaignId: number, campaignApplicabilityScope: RuleScope, campaignApplicabilityScopeId: number): Promise<RepoResponse<number>>;
}
