import { IQueryHandler } from '@nestjs/cqrs';
import { CommissionModelDto } from '../../../dto/commissionModel.dto.g';
import { CommissionModelRepository } from '../../../repositories/commissionModel.repository.g';
import { Response } from '@demo/common';
export declare class GetItemCommissionModelQuery {
    readonly id: number;
    constructor(id: number);
}
export declare class GetItemCommissionModelHandler implements IQueryHandler<GetItemCommissionModelQuery> {
    private readonly repository;
    constructor(repository: CommissionModelRepository);
    execute(query: GetItemCommissionModelQuery): Promise<Response<CommissionModelDto>>;
}
