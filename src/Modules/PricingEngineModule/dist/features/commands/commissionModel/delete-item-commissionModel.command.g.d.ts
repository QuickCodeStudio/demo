import { ICommandHandler } from '@nestjs/cqrs';
import { CommissionModelRepository } from '../../../repositories/commissionModel.repository.g';
import { Response } from '@demo/common';
export declare class DeleteItemCommissionModelCommand {
    readonly id: number;
    constructor(id: number);
}
export declare class DeleteItemCommissionModelHandler implements ICommandHandler<DeleteItemCommissionModelCommand> {
    private readonly repository;
    constructor(repository: CommissionModelRepository);
    execute(command: DeleteItemCommissionModelCommand): Promise<Response<boolean>>;
}
