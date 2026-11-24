import { IQueryHandler } from '@nestjs/cqrs';
import { CategoryCommissionOverrideDto } from '../../../dto/categoryCommissionOverride.dto.g';
import { CategoryCommissionOverrideRepository } from '../../../repositories/categoryCommissionOverride.repository.g';
import { Response } from '@demo/common';
export declare class GetItemCategoryCommissionOverrideQuery {
    readonly id: number;
    constructor(id: number);
}
export declare class GetItemCategoryCommissionOverrideHandler implements IQueryHandler<GetItemCategoryCommissionOverrideQuery> {
    private readonly repository;
    constructor(repository: CategoryCommissionOverrideRepository);
    execute(query: GetItemCategoryCommissionOverrideQuery): Promise<Response<CategoryCommissionOverrideDto>>;
}
