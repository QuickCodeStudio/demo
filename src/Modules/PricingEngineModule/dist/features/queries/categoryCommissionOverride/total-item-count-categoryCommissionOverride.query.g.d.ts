import { IQueryHandler } from '@nestjs/cqrs';
import { CategoryCommissionOverrideRepository } from '../../../repositories/categoryCommissionOverride.repository.g';
import { Response } from '@demo/common';
export declare class TotalItemCountCategoryCommissionOverrideQuery {
}
export declare class TotalItemCountCategoryCommissionOverrideHandler implements IQueryHandler<TotalItemCountCategoryCommissionOverrideQuery> {
    private readonly repository;
    constructor(repository: CategoryCommissionOverrideRepository);
    execute(_query: TotalItemCountCategoryCommissionOverrideQuery): Promise<Response<number>>;
}
