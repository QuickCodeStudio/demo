import { IQueryHandler } from '@nestjs/cqrs';
import { CommissionModelGetByNameResponseDto } from '../../../dto/commissionModel.getByName.response.dto.g';
import { CommissionModelRepository } from '../../../repositories/commissionModel.repository.g';
import { Response } from '@demo/common';
export declare class GetByNameCommissionModelQuery {
    readonly name: string;
    constructor(name: string);
}
export declare class GetByNameCommissionModelHandler implements IQueryHandler<GetByNameCommissionModelQuery> {
    private readonly repository;
    constructor(repository: CommissionModelRepository);
    execute(query: GetByNameCommissionModelQuery): Promise<Response<CommissionModelGetByNameResponseDto>>;
}
