import { IQueryHandler } from '@nestjs/cqrs';
import { SellerCommissionAssignmentGetByModelIdResponseDto } from '../../../dto/sellerCommissionAssignment.getByModelId.response.dto.g';
import { SellerCommissionAssignmentRepository } from '../../../repositories/sellerCommissionAssignment.repository.g';
import { Response } from '@demo/common';
export declare class GetByModelIdSellerCommissionAssignmentQuery {
    readonly commissionModelId: number;
    readonly pageNumber?: number | undefined;
    readonly pageSize?: number | undefined;
    constructor(commissionModelId: number, pageNumber?: number | undefined, pageSize?: number | undefined);
}
export declare class GetByModelIdSellerCommissionAssignmentHandler implements IQueryHandler<GetByModelIdSellerCommissionAssignmentQuery> {
    private readonly repository;
    constructor(repository: SellerCommissionAssignmentRepository);
    execute(query: GetByModelIdSellerCommissionAssignmentQuery): Promise<Response<SellerCommissionAssignmentGetByModelIdResponseDto[]>>;
}
