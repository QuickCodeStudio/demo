import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CommissionModelDto } from '../dto/commissionModel.dto.g';
import { CommissionModelGetActiveResponseDto } from '../dto/commissionModel.getActive.response.dto.g';
import { CommissionModelGetByNameResponseDto } from '../dto/commissionModel.getByName.response.dto.g';
import { CommissionModelDeactivateRequestDto } from '../dto/commissionModel.deactivate.request.dto.g';
import { ListResult } from '@demo/common';
export declare class CommissionModelsController {
    private readonly queryBus;
    private readonly commandBus;
    constructor(queryBus: QueryBus, commandBus: CommandBus);
    listAsync(page?: number, size?: number, includeCount?: boolean): Promise<ListResult<CommissionModelDto>>;
    countAsync(): Promise<number>;
    getItemAsync(id: number): Promise<CommissionModelDto>;
    insertAsync(dto: CommissionModelDto): Promise<CommissionModelDto>;
    updateAsync(id: number, dto: CommissionModelDto): Promise<boolean>;
    deleteAsync(id: number): Promise<boolean>;
    getActiveAsync(pageNumber?: number, pageSize?: number): Promise<CommissionModelGetActiveResponseDto[]>;
    getByNameAsync(name: string): Promise<CommissionModelGetByNameResponseDto>;
    deactivateAsync(commissionModelId: number, dto: CommissionModelDeactivateRequestDto): Promise<number>;
}
