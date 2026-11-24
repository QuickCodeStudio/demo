import { ICommandHandler } from '@nestjs/cqrs';
import { PromotionalCampaignDto } from '../../../dto/promotionalCampaign.dto.g';
import { PromotionalCampaignRepository } from '../../../repositories/promotionalCampaign.repository.g';
import { Response } from '@demo/common';
export declare class InsertPromotionalCampaignCommand {
    readonly dto: PromotionalCampaignDto;
    constructor(dto: PromotionalCampaignDto);
}
export declare class InsertPromotionalCampaignHandler implements ICommandHandler<InsertPromotionalCampaignCommand> {
    private readonly repository;
    constructor(repository: PromotionalCampaignRepository);
    execute(command: InsertPromotionalCampaignCommand): Promise<Response<PromotionalCampaignDto>>;
}
