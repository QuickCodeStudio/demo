import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CommissionRuleDto } from '../dto/commissionRule.dto.g';
import { CommissionRuleGetByModelIdResponseDto } from '../dto/commissionRule.getByModelId.response.dto.g';
import { CommissionRuleGetActiveRulesByModelResponseDto } from '../dto/commissionRule.getActiveRulesByModel.response.dto.g';
import { CommissionRuleDeactivateRequestDto } from '../dto/commissionRule.deactivate.request.dto.g';
import { ListResult } from '@demo/common';
export declare class CommissionRulesController {
    private readonly queryBus;
    private readonly commandBus;
    constructor(queryBus: QueryBus, commandBus: CommandBus);
    listAsync(page?: number, size?: number, includeCount?: boolean): Promise<ListResult<CommissionRuleDto>>;
    countAsync(): Promise<number>;
    getItemAsync(id: number): Promise<CommissionRuleDto>;
    insertAsync(dto: CommissionRuleDto): Promise<CommissionRuleDto>;
    updateAsync(id: number, dto: CommissionRuleDto): Promise<boolean>;
    deleteAsync(id: number): Promise<boolean>;
    getByModelIdAsync(commissionModelId: number, pageNumber?: number, pageSize?: number): Promise<CommissionRuleGetByModelIdResponseDto[]>;
    getActiveRulesByModelAsync(commissionModelId: number, pageNumber?: number, pageSize?: number): Promise<CommissionRuleGetActiveRulesByModelResponseDto[]>;
    deactivateAsync(commissionRuleId: number, dto: CommissionRuleDeactivateRequestDto): Promise<number>;
}
