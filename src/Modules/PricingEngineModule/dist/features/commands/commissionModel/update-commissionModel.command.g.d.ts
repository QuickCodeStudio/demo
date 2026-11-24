import { ICommandHandler } from '@nestjs/cqrs';
import { UpdateCommissionModelDto } from '../../../dto/update-commissionModel.dto.g';
import { CommissionModelRepository } from '../../../repositories/commissionModel.repository.g';
import { Response } from '@demo/common';
export declare class UpdateCommissionModelCommand {
    readonly id: number;
    readonly dto: UpdateCommissionModelDto;
    constructor(id: number, dto: UpdateCommissionModelDto);
}
export declare class UpdateCommissionModelHandler implements ICommandHandler<UpdateCommissionModelCommand> {
    private readonly repository;
    constructor(repository: CommissionModelRepository);
    execute(command: UpdateCommissionModelCommand): Promise<Response<boolean>>;
}
