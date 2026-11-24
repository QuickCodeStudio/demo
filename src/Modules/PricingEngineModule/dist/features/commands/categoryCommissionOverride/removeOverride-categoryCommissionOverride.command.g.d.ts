import { ICommandHandler } from '@nestjs/cqrs';
import { CategoryCommissionOverrideRepository } from '../../../repositories/categoryCommissionOverride.repository.g';
import { Response } from '@demo/common';
export declare class RemoveOverrideCategoryCommissionOverrideCommand {
    readonly categoryCommissionOverrideId: number;
    constructor(categoryCommissionOverrideId: number);
}
export declare class RemoveOverrideCategoryCommissionOverrideHandler implements ICommandHandler<RemoveOverrideCategoryCommissionOverrideCommand> {
    private readonly repository;
    constructor(repository: CategoryCommissionOverrideRepository);
    execute(command: RemoveOverrideCategoryCommissionOverrideCommand): Promise<Response<number>>;
}
