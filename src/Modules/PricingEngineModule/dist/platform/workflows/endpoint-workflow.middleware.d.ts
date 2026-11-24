import { NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { EndpointWorkflowExecutor } from './endpoint-workflow.executor';
import { EndpointWorkflowRegistry } from './endpoint-workflow.registry';
import { IdempotencyStore } from './in-memory-idempotency-store';
export declare class EndpointWorkflowMiddleware implements NestMiddleware {
    private readonly registry;
    private readonly executor;
    private readonly logger;
    private readonly idempotencyStore;
    constructor(registry: EndpointWorkflowRegistry, executor: EndpointWorkflowExecutor, idempotencyStore?: IdempotencyStore);
    use(req: Request, res: Response, next: NextFunction): Promise<void>;
    private tryGetCached;
    private writeAndCache;
}
export declare function shouldSkip(path: string | undefined): boolean;
