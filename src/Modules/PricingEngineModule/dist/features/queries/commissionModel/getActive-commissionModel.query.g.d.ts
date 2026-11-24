import { IQueryHandler } from '@nestjs/cqrs';
import { CommissionModelGetActiveResponseDto } from '../../../dto/commissionModel.getActive.response.dto.g';
import { CommissionModelRepository } from '../../../repositories/commissionModel.repository.g';
import { Response } from '@demo/common';
export declare class GetActiveCommissionModelQuery {
    readonly pageNumber?: number | undefined;
    readonly pageSize?: number | undefined;
    constructor(pageNumber?: number | undefined, pageSize?: number | undefined);
}
export declare class GetActiveCommissionModelHandler implements IQueryHandler<GetActiveCommissionModelQuery> {
    private readonly repository;
    constructor(repository: CommissionModelRepository);
    execute(query: GetActiveCommissionModelQuery): Promise<Response<CommissionModelGetActiveResponseDto[]>>;
}
