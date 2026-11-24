import { IQueryHandler } from '@nestjs/cqrs';
import { SellerCommissionAssignmentRepository } from '../../../repositories/sellerCommissionAssignment.repository.g';
import { Response } from '@demo/common';
export declare class TotalItemCountSellerCommissionAssignmentQuery {
}
export declare class TotalItemCountSellerCommissionAssignmentHandler implements IQueryHandler<TotalItemCountSellerCommissionAssignmentQuery> {
    private readonly repository;
    constructor(repository: SellerCommissionAssignmentRepository);
    execute(_query: TotalItemCountSellerCommissionAssignmentQuery): Promise<Response<number>>;
}
