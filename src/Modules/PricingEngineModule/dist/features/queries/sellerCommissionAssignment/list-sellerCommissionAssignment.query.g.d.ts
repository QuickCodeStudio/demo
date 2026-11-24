import { IQueryHandler } from '@nestjs/cqrs';
import { SellerCommissionAssignmentDto } from '../../../dto/sellerCommissionAssignment.dto.g';
import { SellerCommissionAssignmentRepository } from '../../../repositories/sellerCommissionAssignment.repository.g';
import { Response, ListResult } from '@demo/common';
export declare class ListSellerCommissionAssignmentQuery {
    readonly page?: number | undefined;
    readonly size?: number | undefined;
    readonly includeCount: boolean;
    constructor(page?: number | undefined, size?: number | undefined, includeCount?: boolean);
}
export declare class ListSellerCommissionAssignmentHandler implements IQueryHandler<ListSellerCommissionAssignmentQuery> {
    private readonly repository;
    constructor(repository: SellerCommissionAssignmentRepository);
    execute(query: ListSellerCommissionAssignmentQuery): Promise<Response<ListResult<SellerCommissionAssignmentDto>>>;
}
