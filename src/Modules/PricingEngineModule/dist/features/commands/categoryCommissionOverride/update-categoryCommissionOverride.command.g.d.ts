import { ICommandHandler } from '@nestjs/cqrs';
import { UpdateCategoryCommissionOverrideDto } from '../../../dto/update-categoryCommissionOverride.dto.g';
import { CategoryCommissionOverrideRepository } from '../../../repositories/categoryCommissionOverride.repository.g';
import { Response } from '@demo/common';
export declare class UpdateCategoryCommissionOverrideCommand {
    readonly id: number;
    readonly dto: UpdateCategoryCommissionOverrideDto;
    constructor(id: number, dto: UpdateCategoryCommissionOverrideDto);
}
export declare class UpdateCategoryCommissionOverrideHandler implements ICommandHandler<UpdateCategoryCommissionOverrideCommand> {
    private readonly repository;
    constructor(repository: CategoryCommissionOverrideRepository);
    execute(command: UpdateCategoryCommissionOverrideCommand): Promise<Response<boolean>>;
}
