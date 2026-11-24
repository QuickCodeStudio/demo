import { ICommandHandler } from '@nestjs/cqrs';
import { SellerCommissionAssignmentRepository } from '../../../repositories/sellerCommissionAssignment.repository.g';
import { Response } from '@demo/common';
export declare class DeleteItemSellerCommissionAssignmentCommand {
    readonly sellerId: number;
    constructor(sellerId: number);
}
export declare class DeleteItemSellerCommissionAssignmentHandler implements ICommandHandler<DeleteItemSellerCommissionAssignmentCommand> {
    private readonly repository;
    constructor(repository: SellerCommissionAssignmentRepository);
    execute(command: DeleteItemSellerCommissionAssignmentCommand): Promise<Response<boolean>>;
}
