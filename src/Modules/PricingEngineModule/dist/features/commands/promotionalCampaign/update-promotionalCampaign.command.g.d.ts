import { ICommandHandler } from '@nestjs/cqrs';
import { UpdatePromotionalCampaignDto } from '../../../dto/update-promotionalCampaign.dto.g';
import { PromotionalCampaignRepository } from '../../../repositories/promotionalCampaign.repository.g';
import { Response } from '@demo/common';
export declare class UpdatePromotionalCampaignCommand {
    readonly id: number;
    readonly dto: UpdatePromotionalCampaignDto;
    constructor(id: number, dto: UpdatePromotionalCampaignDto);
}
export declare class UpdatePromotionalCampaignHandler implements ICommandHandler<UpdatePromotionalCampaignCommand> {
    private readonly repository;
    constructor(repository: PromotionalCampaignRepository);
    execute(command: UpdatePromotionalCampaignCommand): Promise<Response<boolean>>;
}
