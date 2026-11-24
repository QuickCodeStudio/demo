import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SellerCommissionAssignmentDto } from '../dto/sellerCommissionAssignment.dto.g';
import { SellerCommissionAssignmentGetBySellerIdResponseDto } from '../dto/sellerCommissionAssignment.getBySellerId.response.dto.g';
import { SellerCommissionAssignmentGetByModelIdResponseDto } from '../dto/sellerCommissionAssignment.getByModelId.response.dto.g';
import { ListResult } from '@demo/common';
export declare class SellerCommissionAssignmentsController {
    private readonly queryBus;
    private readonly commandBus;
    constructor(queryBus: QueryBus, commandBus: CommandBus);
    listAsync(page?: number, size?: number, includeCount?: boolean): Promise<ListResult<SellerCommissionAssignmentDto>>;
    countAsync(): Promise<number>;
    getItemAsync(sellerId: number): Promise<SellerCommissionAssignmentDto>;
    insertAsync(dto: SellerCommissionAssignmentDto): Promise<SellerCommissionAssignmentDto>;
    updateAsync(sellerId: number, dto: SellerCommissionAssignmentDto): Promise<boolean>;
    deleteAsync(sellerId: number): Promise<boolean>;
    getBySellerIdAsync(sellerId: number): Promise<SellerCommissionAssignmentGetBySellerIdResponseDto>;
    getByModelIdAsync(commissionModelId: number, pageNumber?: number, pageSize?: number): Promise<SellerCommissionAssignmentGetByModelIdResponseDto[]>;
    removeAssignmentAsync(sellerCommissionAssignmentSellerId: number): Promise<number>;
}
