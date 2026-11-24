import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CategoryCommissionOverrideDto } from '../dto/categoryCommissionOverride.dto.g';
import { CategoryCommissionOverrideGetByCategoryIdResponseDto } from '../dto/categoryCommissionOverride.getByCategoryId.response.dto.g';
import { ListResult } from '@demo/common';
export declare class CategoryCommissionOverridesController {
    private readonly queryBus;
    private readonly commandBus;
    constructor(queryBus: QueryBus, commandBus: CommandBus);
    listAsync(page?: number, size?: number, includeCount?: boolean): Promise<ListResult<CategoryCommissionOverrideDto>>;
    countAsync(): Promise<number>;
    getItemAsync(id: number): Promise<CategoryCommissionOverrideDto>;
    insertAsync(dto: CategoryCommissionOverrideDto): Promise<CategoryCommissionOverrideDto>;
    updateAsync(id: number, dto: CategoryCommissionOverrideDto): Promise<boolean>;
    deleteAsync(id: number): Promise<boolean>;
    getByCategoryIdAsync(categoryId: number): Promise<CategoryCommissionOverrideGetByCategoryIdResponseDto>;
    removeOverrideAsync(categoryCommissionOverrideId: number): Promise<number>;
}
