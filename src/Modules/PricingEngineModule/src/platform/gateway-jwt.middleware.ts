import { createPrivateKey, createPublicKey, KeyObject, randomUUID } from 'crypto';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { isHealthPath } from '../auditing/security-audit.middleware';

const DEFAULT_ISSUER = 'quickcode-gateway';

/**
 * Nest parity of C# AddGatewayServiceTokenAuthentication —
 * validates Gateway RS256 Bearer when present; does not require token globally
 * (domain APIs sit behind YARP which already authenticates callers).
 */
@Injectable()
export class GatewayJwtMiddleware implements NestMiddleware {
  private readonly logger = new Logger(GatewayJwtMiddleware.name);
  private readonly publicKey: KeyObject | null;
  private readonly issuer: string;
  private readonly audience: string;

  constructor() {
    this.issuer =
      process.env.GATEWAY_JWT_ISSUER ||
      process.env.GatewayServiceTokenSettings__Issuer ||
      DEFAULT_ISSUER;
    this.audience =
      process.env.MODULE_NAME ||
      process.env.AppSettings__ModuleName ||
      'PricingEngineModule';
    this.publicKey = loadPublicKey();
    if (!this.publicKey) {
      this.logger.warn(
        'GATEWAY_JWT_PUBLIC_KEY not set — Bearer tokens will not be validated',
      );
    }
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.path || req.url || '';
    if (isHealthPath(path) || path.startsWith('/swagger')) {
      next();
      return;
    }

    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ') || !this.publicKey) {
      next();
      return;
    }

    const token = header.slice('Bearer '.length).trim();
    try {
      const payload = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: this.issuer,
        audience: this.audience,
        clockTolerance: 2,
      }) as jwt.JwtPayload;

      (req as any).user = {
        id: payload.sub ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
        sub: payload.sub,
        email: payload.email,
        permissionGroup: payload['PermissionGroupName'],
        claims: payload,
      };
    } catch (err) {
      this.logger.warn(
        `Gateway JWT validation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      // Match typical module behavior behind gateway: reject clearly bad tokens
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    next();
  }
}

export function loadPublicKey(): KeyObject | null {
  const b64 =
    process.env.GATEWAY_JWT_PUBLIC_KEY ||
    process.env.QUICKCODE_GATEWAY_JWT_PUBLIC_KEY;
  if (!b64?.trim()) return null;
  try {
    return createPublicKey({
      key: Buffer.from(b64.trim(), 'base64'),
      format: 'der',
      type: 'spki',
    });
  } catch (err) {
    console.warn('Failed to parse GATEWAY_JWT_PUBLIC_KEY', err);
    return null;
  }
}

export function loadPrivateKey(): KeyObject | null {
  const b64 =
    process.env.GATEWAY_JWT_PRIVATE_KEY ||
    process.env.QUICKCODE_GATEWAY_JWT_PRIVATE_KEY;
  if (!b64?.trim()) return null;
  try {
    return createPrivateKey({
      key: Buffer.from(b64.trim(), 'base64'),
      format: 'der',
      type: 'pkcs8',
    });
  } catch {
    return null;
  }
}

/** Mint short-lived service token (needs private key — same as C# GatewayServiceTokenGenerator). */
export function createGatewayServiceToken(targetModuleName: string): string | null {
  const key = loadPrivateKey();
  if (!key) return null;
  const issuer =
    process.env.GATEWAY_JWT_ISSUER ||
    process.env.GatewayServiceTokenSettings__Issuer ||
    DEFAULT_ISSUER;
  const expiresIn = Number(process.env.GATEWAY_JWT_EXPIRATION_SECONDS ?? 60);
  return jwt.sign(
    {
      PermissionGroupName: 'InternalService',
    },
    key,
    {
      algorithm: 'RS256',
      issuer,
      audience: targetModuleName,
      subject: 'gateway',
      expiresIn,
      jwtid: randomUUID(),
    },
  );
}
