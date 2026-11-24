import { IQueryHandler } from '@nestjs/cqrs';
import { CommissionModelRepository } from '../../../repositories/commissionModel.repository.g';
import { Response } from '@demo/common';
export declare class TotalItemCountCommissionModelQuery {
}
export declare class TotalItemCountCommissionModelHandler implements IQueryHandler<TotalItemCountCommissionModelQuery> {
    private readonly repository;
    constructor(repository: CommissionModelRepository);
    execute(_query: TotalItemCountCommissionModelQuery): Promise<Response<number>>;
}
