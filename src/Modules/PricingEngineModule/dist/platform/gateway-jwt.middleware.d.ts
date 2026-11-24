import { KeyObject } from 'crypto';
import { NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
export declare class GatewayJwtMiddleware implements NestMiddleware {
    private readonly logger;
    private readonly publicKey;
    private readonly issuer;
    private readonly audience;
    constructor();
    use(req: Request, res: Response, next: NextFunction): void;
}
export declare function loadPublicKey(): KeyObject | null;
export declare function loadPrivateKey(): KeyObject | null;
export declare function createGatewayServiceToken(targetModuleName: string): string | null;
