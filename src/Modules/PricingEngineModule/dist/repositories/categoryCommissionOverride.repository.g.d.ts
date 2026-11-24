import { DataSource } from 'typeorm';
import { CategoryCommissionOverrideDto } from '../dto/categoryCommissionOverride.dto.g';
import { UpdateCategoryCommissionOverrideDto } from '../dto/update-categoryCommissionOverride.dto.g';
import { CategoryCommissionOverrideGetByCategoryIdResponseDto } from '../dto/categoryCommissionOverride.getByCategoryId.response.dto.g';
import { ICategoryCommissionOverrideRepository } from './categoryCommissionOverride.repository.interface.g';
import { RepoResponse } from '@demo/common';
export declare class CategoryCommissionOverrideRepository implements ICategoryCommissionOverrideRepository {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    listAsync(page?: number, size?: number): Promise<RepoResponse<CategoryCommissionOverrideDto[]>>;
    countAsync(): Promise<RepoResponse<number>>;
    getByPkAsync(id: number): Promise<RepoResponse<CategoryCommissionOverrideDto>>;
    insertAsync(dto: CategoryCommissionOverrideDto): Promise<RepoResponse<CategoryCommissionOverrideDto>>;
    updateAsync(id: number, dto: UpdateCategoryCommissionOverrideDto): Promise<RepoResponse<boolean>>;
    deleteAsync(id: number): Promise<RepoResponse<boolean>>;
    getByCategoryIdAsync(categoryId: number): Promise<RepoResponse<CategoryCommissionOverrideGetByCategoryIdResponseDto>>;
    removeOverrideAsync(categoryCommissionOverrideId: number): Promise<RepoResponse<number>>;
    private toDto;
    private pick;
}
