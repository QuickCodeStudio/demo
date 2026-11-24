import { DataSource } from 'typeorm';
import { CommissionModelDto } from '../dto/commissionModel.dto.g';
import { UpdateCommissionModelDto } from '../dto/update-commissionModel.dto.g';
import { CommissionModelGetActiveResponseDto } from '../dto/commissionModel.getActive.response.dto.g';
import { CommissionModelGetByNameResponseDto } from '../dto/commissionModel.getByName.response.dto.g';
import { CommissionModelDeactivateRequestDto } from '../dto/commissionModel.deactivate.request.dto.g';
import { ICommissionModelRepository } from './commissionModel.repository.interface.g';
import { RepoResponse } from '@demo/common';
export declare class CommissionModelRepository implements ICommissionModelRepository {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    listAsync(page?: number, size?: number): Promise<RepoResponse<CommissionModelDto[]>>;
    countAsync(): Promise<RepoResponse<number>>;
    getByPkAsync(id: number): Promise<RepoResponse<CommissionModelDto>>;
    insertAsync(dto: CommissionModelDto): Promise<RepoResponse<CommissionModelDto>>;
    updateAsync(id: number, dto: UpdateCommissionModelDto): Promise<RepoResponse<boolean>>;
    deleteAsync(id: number): Promise<RepoResponse<boolean>>;
    getActiveAsync(pageNumber?: number, pageSize?: number): Promise<RepoResponse<CommissionModelGetActiveResponseDto[]>>;
    getByNameAsync(name: string): Promise<RepoResponse<CommissionModelGetByNameResponseDto>>;
    deactivateAsync(commissionModelId: number, dto: CommissionModelDeactivateRequestDto): Promise<RepoResponse<number>>;
    private toDto;
    private pick;
}
