import { IQueryHandler } from '@nestjs/cqrs';
import { SellerCommissionAssignmentGetBySellerIdResponseDto } from '../../../dto/sellerCommissionAssignment.getBySellerId.response.dto.g';
import { SellerCommissionAssignmentRepository } from '../../../repositories/sellerCommissionAssignment.repository.g';
import { Response } from '@demo/common';
export declare class GetBySellerIdSellerCommissionAssignmentQuery {
    readonly sellerId: number;
    constructor(sellerId: number);
}
export declare class GetBySellerIdSellerCommissionAssignmentHandler implements IQueryHandler<GetBySellerIdSellerCommissionAssignmentQuery> {
    private readonly repository;
    constructor(repository: SellerCommissionAssignmentRepository);
    execute(query: GetBySellerIdSellerCommissionAssignmentQuery): Promise<Response<SellerCommissionAssignmentGetBySellerIdResponseDto>>;
}
