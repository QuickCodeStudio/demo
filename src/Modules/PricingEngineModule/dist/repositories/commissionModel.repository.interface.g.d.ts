import { CommissionModelDto } from '../dto/commissionModel.dto.g';
import { UpdateCommissionModelDto } from '../dto/update-commissionModel.dto.g';
import { CommissionModelGetActiveResponseDto } from '../dto/commissionModel.getActive.response.dto.g';
import { CommissionModelGetByNameResponseDto } from '../dto/commissionModel.getByName.response.dto.g';
import { CommissionModelDeactivateRequestDto } from '../dto/commissionModel.deactivate.request.dto.g';
import { RepoResponse } from '@demo/common';
export interface ICommissionModelRepository {
    listAsync(page?: number, size?: number): Promise<RepoResponse<CommissionModelDto[]>>;
    countAsync(): Promise<RepoResponse<number>>;
    getByPkAsync(id: number): Promise<RepoResponse<CommissionModelDto>>;
    insertAsync(dto: CommissionModelDto): Promise<RepoResponse<CommissionModelDto>>;
    updateAsync(id: number, dto: UpdateCommissionModelDto): Promise<RepoResponse<boolean>>;
    deleteAsync(id: number): Promise<RepoResponse<boolean>>;
    getActiveAsync(pageNumber?: number, pageSize?: number): Promise<RepoResponse<CommissionModelGetActiveResponseDto[]>>;
    getByNameAsync(name: string): Promise<RepoResponse<CommissionModelGetByNameResponseDto>>;
    deactivateAsync(commissionModelId: number, dto: CommissionModelDeactivateRequestDto): Promise<RepoResponse<number>>;
}
