import { IQueryHandler } from '@nestjs/cqrs';
import { CategoryCommissionOverrideGetByCategoryIdResponseDto } from '../../../dto/categoryCommissionOverride.getByCategoryId.response.dto.g';
import { CategoryCommissionOverrideRepository } from '../../../repositories/categoryCommissionOverride.repository.g';
import { Response } from '@demo/common';
export declare class GetByCategoryIdCategoryCommissionOverrideQuery {
    readonly categoryId: number;
    constructor(categoryId: number);
}
export declare class GetByCategoryIdCategoryCommissionOverrideHandler implements IQueryHandler<GetByCategoryIdCategoryCommissionOverrideQuery> {
    private readonly repository;
    constructor(repository: CategoryCommissionOverrideRepository);
    execute(query: GetByCategoryIdCategoryCommissionOverrideQuery): Promise<Response<CategoryCommissionOverrideGetByCategoryIdResponseDto>>;
}
