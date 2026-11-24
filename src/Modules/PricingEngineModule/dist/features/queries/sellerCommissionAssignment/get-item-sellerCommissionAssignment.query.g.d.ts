import { IQueryHandler } from '@nestjs/cqrs';
import { SellerCommissionAssignmentDto } from '../../../dto/sellerCommissionAssignment.dto.g';
import { SellerCommissionAssignmentRepository } from '../../../repositories/sellerCommissionAssignment.repository.g';
import { Response } from '@demo/common';
export declare class GetItemSellerCommissionAssignmentQuery {
    readonly sellerId: number;
    constructor(sellerId: number);
}
export declare class GetItemSellerCommissionAssignmentHandler implements IQueryHandler<GetItemSellerCommissionAssignmentQuery> {
    private readonly repository;
    constructor(repository: SellerCommissionAssignmentRepository);
    execute(query: GetItemSellerCommissionAssignmentQuery): Promise<Response<SellerCommissionAssignmentDto>>;
}
