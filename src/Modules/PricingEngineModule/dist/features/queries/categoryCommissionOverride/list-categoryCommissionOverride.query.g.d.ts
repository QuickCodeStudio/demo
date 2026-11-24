import { IQueryHandler } from '@nestjs/cqrs';
import { CategoryCommissionOverrideDto } from '../../../dto/categoryCommissionOverride.dto.g';
import { CategoryCommissionOverrideRepository } from '../../../repositories/categoryCommissionOverride.repository.g';
import { Response, ListResult } from '@demo/common';
export declare class ListCategoryCommissionOverrideQuery {
    readonly page?: number | undefined;
    readonly size?: number | undefined;
    readonly includeCount: boolean;
    constructor(page?: number | undefined, size?: number | undefined, includeCount?: boolean);
}
export declare class ListCategoryCommissionOverrideHandler implements IQueryHandler<ListCategoryCommissionOverrideQuery> {
    private readonly repository;
    constructor(repository: CategoryCommissionOverrideRepository);
    execute(query: ListCategoryCommissionOverrideQuery): Promise<Response<ListResult<CategoryCommissionOverrideDto>>>;
}
