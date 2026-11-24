import { ICommandHandler } from '@nestjs/cqrs';
import { PromotionalCampaignDeactivateRequestDto } from '../../../dto/promotionalCampaign.deactivate.request.dto.g';
import { PromotionalCampaignRepository } from '../../../repositories/promotionalCampaign.repository.g';
import { Response } from '@demo/common';
export declare class DeactivatePromotionalCampaignCommand {
    readonly promotionalCampaignId: number;
    readonly dto: PromotionalCampaignDeactivateRequestDto;
    constructor(promotionalCampaignId: number, dto: PromotionalCampaignDeactivateRequestDto);
}
export declare class DeactivatePromotionalCampaignHandler implements ICommandHandler<DeactivatePromotionalCampaignCommand> {
    private readonly repository;
    constructor(repository: PromotionalCampaignRepository);
    execute(command: DeactivatePromotionalCampaignCommand): Promise<Response<number>>;
}
