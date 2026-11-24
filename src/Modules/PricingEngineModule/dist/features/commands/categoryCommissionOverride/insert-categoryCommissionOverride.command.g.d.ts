import { ICommandHandler } from '@nestjs/cqrs';
import { CategoryCommissionOverrideDto } from '../../../dto/categoryCommissionOverride.dto.g';
import { CategoryCommissionOverrideRepository } from '../../../repositories/categoryCommissionOverride.repository.g';
import { Response } from '@demo/common';
export declare class InsertCategoryCommissionOverrideCommand {
    readonly dto: CategoryCommissionOverrideDto;
    constructor(dto: CategoryCommissionOverrideDto);
}
export declare class InsertCategoryCommissionOverrideHandler implements ICommandHandler<InsertCategoryCommissionOverrideCommand> {
    private readonly repository;
    constructor(repository: CategoryCommissionOverrideRepository);
    execute(command: InsertCategoryCommissionOverrideCommand): Promise<Response<CategoryCommissionOverrideDto>>;
}
