import { IQueryHandler } from '@nestjs/cqrs';
import { CommissionModelDto } from '../../../dto/commissionModel.dto.g';
import { CommissionModelRepository } from '../../../repositories/commissionModel.repository.g';
import { Response, ListResult } from '@demo/common';
export declare class ListCommissionModelQuery {
    readonly page?: number | undefined;
    readonly size?: number | undefined;
    readonly includeCount: boolean;
    constructor(page?: number | undefined, size?: number | undefined, includeCount?: boolean);
}
export declare class ListCommissionModelHandler implements IQueryHandler<ListCommissionModelQuery> {
    private readonly repository;
    constructor(repository: CommissionModelRepository);
    execute(query: ListCommissionModelQuery): Promise<Response<ListResult<CommissionModelDto>>>;
}
