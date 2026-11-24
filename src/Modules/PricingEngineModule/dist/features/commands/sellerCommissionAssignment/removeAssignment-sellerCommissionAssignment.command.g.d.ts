import { ICommandHandler } from '@nestjs/cqrs';
import { SellerCommissionAssignmentRepository } from '../../../repositories/sellerCommissionAssignment.repository.g';
import { Response } from '@demo/common';
export declare class RemoveAssignmentSellerCommissionAssignmentCommand {
    readonly sellerCommissionAssignmentSellerId: number;
    constructor(sellerCommissionAssignmentSellerId: number);
}
export declare class RemoveAssignmentSellerCommissionAssignmentHandler implements ICommandHandler<RemoveAssignmentSellerCommissionAssignmentCommand> {
    private readonly repository;
    constructor(repository: SellerCommissionAssignmentRepository);
    execute(command: RemoveAssignmentSellerCommissionAssignmentCommand): Promise<Response<number>>;
}
