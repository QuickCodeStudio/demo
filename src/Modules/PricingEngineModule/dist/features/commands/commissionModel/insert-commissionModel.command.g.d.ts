import { ICommandHandler } from '@nestjs/cqrs';
import { CommissionModelDto } from '../../../dto/commissionModel.dto.g';
import { CommissionModelRepository } from '../../../repositories/commissionModel.repository.g';
import { Response } from '@demo/common';
export declare class InsertCommissionModelCommand {
    readonly dto: CommissionModelDto;
    constructor(dto: CommissionModelDto);
}
export declare class InsertCommissionModelHandler implements ICommandHandler<InsertCommissionModelCommand> {
    private readonly repository;
    constructor(repository: CommissionModelRepository);
    execute(command: InsertCommissionModelCommand): Promise<Response<CommissionModelDto>>;
}
