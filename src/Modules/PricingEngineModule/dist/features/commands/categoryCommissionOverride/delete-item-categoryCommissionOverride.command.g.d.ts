import { ICommandHandler } from '@nestjs/cqrs';
import { CategoryCommissionOverrideRepository } from '../../../repositories/categoryCommissionOverride.repository.g';
import { Response } from '@demo/common';
export declare class DeleteItemCategoryCommissionOverrideCommand {
    readonly id: number;
    constructor(id: number);
}
export declare class DeleteItemCategoryCommissionOverrideHandler implements ICommandHandler<DeleteItemCategoryCommissionOverrideCommand> {
    private readonly repository;
    constructor(repository: CategoryCommissionOverrideRepository);
    execute(command: DeleteItemCategoryCommissionOverrideCommand): Promise<Response<boolean>>;
}
