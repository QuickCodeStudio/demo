import { ICommandHandler } from '@nestjs/cqrs';
import { UpdateSellerCommissionAssignmentDto } from '../../../dto/update-sellerCommissionAssignment.dto.g';
import { SellerCommissionAssignmentRepository } from '../../../repositories/sellerCommissionAssignment.repository.g';
import { Response } from '@demo/common';
export declare class UpdateSellerCommissionAssignmentCommand {
    readonly sellerId: number;
    readonly dto: UpdateSellerCommissionAssignmentDto;
    constructor(sellerId: number, dto: UpdateSellerCommissionAssignmentDto);
}
export declare class UpdateSellerCommissionAssignmentHandler implements ICommandHandler<UpdateSellerCommissionAssignmentCommand> {
    private readonly repository;
    constructor(repository: SellerCommissionAssignmentRepository);
    execute(command: UpdateSellerCommissionAssignmentCommand): Promise<Response<boolean>>;
}
