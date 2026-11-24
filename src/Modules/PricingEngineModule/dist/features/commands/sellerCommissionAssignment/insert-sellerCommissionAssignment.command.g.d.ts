import { ICommandHandler } from '@nestjs/cqrs';
import { SellerCommissionAssignmentDto } from '../../../dto/sellerCommissionAssignment.dto.g';
import { SellerCommissionAssignmentRepository } from '../../../repositories/sellerCommissionAssignment.repository.g';
import { Response } from '@demo/common';
export declare class InsertSellerCommissionAssignmentCommand {
    readonly dto: SellerCommissionAssignmentDto;
    constructor(dto: SellerCommissionAssignmentDto);
}
export declare class InsertSellerCommissionAssignmentHandler implements ICommandHandler<InsertSellerCommissionAssignmentCommand> {
    private readonly repository;
    constructor(repository: SellerCommissionAssignmentRepository);
    execute(command: InsertSellerCommissionAssignmentCommand): Promise<Response<SellerCommissionAssignmentDto>>;
}
