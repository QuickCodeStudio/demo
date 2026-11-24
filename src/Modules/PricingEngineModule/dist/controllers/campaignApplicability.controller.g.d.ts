import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CampaignApplicabilityDto } from '../dto/campaignApplicability.dto.g';
import { CampaignApplicabilityGetByCampaignIdResponseDto } from '../dto/campaignApplicability.getByCampaignId.response.dto.g';
import { ListResult } from '@demo/common';
import { RuleScope } from '../enums/ruleScope.enum.g';
export declare class CampaignApplicabilitiesController {
    private readonly queryBus;
    private readonly commandBus;
    constructor(queryBus: QueryBus, commandBus: CommandBus);
    listAsync(page?: number, size?: number, includeCount?: boolean): Promise<ListResult<CampaignApplicabilityDto>>;
    countAsync(): Promise<number>;
    getItemAsync(campaignId: number, scope: RuleScope, scopeId: number): Promise<CampaignApplicabilityDto>;
    insertAsync(dto: CampaignApplicabilityDto): Promise<CampaignApplicabilityDto>;
    updateAsync(campaignId: number, scope: RuleScope, scopeId: number, dto: CampaignApplicabilityDto): Promise<boolean>;
    deleteAsync(campaignId: number, scope: RuleScope, scopeId: number): Promise<boolean>;
    getByCampaignIdAsync(campaignId: number): Promise<CampaignApplicabilityGetByCampaignIdResponseDto[]>;
    removeApplicabilityAsync(campaignApplicabilityCampaignId: number, campaignApplicabilityScope: RuleScope, campaignApplicabilityScopeId: number): Promise<number>;
}
