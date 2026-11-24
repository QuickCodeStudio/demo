import { ICommandHandler } from '@nestjs/cqrs';
import { PromotionalCampaignRepository } from '../../../repositories/promotionalCampaign.repository.g';
import { Response } from '@demo/common';
export declare class DeleteItemPromotionalCampaignCommand {
    readonly id: number;
    constructor(id: number);
}
export declare class DeleteItemPromotionalCampaignHandler implements ICommandHandler<DeleteItemPromotionalCampaignCommand> {
    private readonly repository;
    constructor(repository: PromotionalCampaignRepository);
    execute(command: DeleteItemPromotionalCampaignCommand): Promise<Response<boolean>>;
}
