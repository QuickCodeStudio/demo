import { ICommandHandler } from '@nestjs/cqrs';
import { CommissionModelDeactivateRequestDto } from '../../../dto/commissionModel.deactivate.request.dto.g';
import { CommissionModelRepository } from '../../../repositories/commissionModel.repository.g';
import { Response } from '@demo/common';
export declare class DeactivateCommissionModelCommand {
    readonly commissionModelId: number;
    readonly dto: CommissionModelDeactivateRequestDto;
    constructor(commissionModelId: number, dto: CommissionModelDeactivateRequestDto);
}
export declare class DeactivateCommissionModelHandler implements ICommandHandler<DeactivateCommissionModelCommand> {
    private readonly repository;
    constructor(repository: CommissionModelRepository);
    execute(command: DeactivateCommissionModelCommand): Promise<Response<number>>;
}
