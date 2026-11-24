import { NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
export declare class RateLimitMiddleware implements NestMiddleware {
    private readonly logger;
    private readonly buckets;
    private readonly enabled;
    private readonly windowSeconds;
    private readonly permits;
    use(req: Request, res: Response, next: NextFunction): void;
}
