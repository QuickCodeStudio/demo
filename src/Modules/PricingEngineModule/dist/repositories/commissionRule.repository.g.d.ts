import { DataSource } from 'typeorm';
import { CommissionRuleDto } from '../dto/commissionRule.dto.g';
import { UpdateCommissionRuleDto } from '../dto/update-commissionRule.dto.g';
import { CommissionRuleGetByModelIdResponseDto } from '../dto/commissionRule.getByModelId.response.dto.g';
import { CommissionRuleGetActiveRulesByModelResponseDto } from '../dto/commissionRule.getActiveRulesByModel.response.dto.g';
import { CommissionRuleDeactivateRequestDto } from '../dto/commissionRule.deactivate.request.dto.g';
import { ICommissionRuleRepository } from './commissionRule.repository.interface.g';
import { RepoResponse } from '@demo/common';
export declare class CommissionRuleRepository implements ICommissionRuleRepository {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    listAsync(page?: number, size?: number): Promise<RepoResponse<CommissionRuleDto[]>>;
    countAsync(): Promise<RepoResponse<number>>;
    getByPkAsync(id: number): Promise<RepoResponse<CommissionRuleDto>>;
    insertAsync(dto: CommissionRuleDto): Promise<RepoResponse<CommissionRuleDto>>;
    updateAsync(id: number, dto: UpdateCommissionRuleDto): Promise<RepoResponse<boolean>>;
    deleteAsync(id: number): Promise<RepoResponse<boolean>>;
    getByModelIdAsync(commissionModelId: number, pageNumber?: number, pageSize?: number): Promise<RepoResponse<CommissionRuleGetByModelIdResponseDto[]>>;
    getActiveRulesByModelAsync(commissionModelId: number, pageNumber?: number, pageSize?: number): Promise<RepoResponse<CommissionRuleGetActiveRulesByModelResponseDto[]>>;
    deactivateAsync(commissionRuleId: number, dto: CommissionRuleDeactivateRequestDto): Promise<RepoResponse<number>>;
    private toDto;
    private pick;
}
