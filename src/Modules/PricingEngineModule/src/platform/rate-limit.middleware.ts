import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { isHealthPath } from '../auditing/security-audit.middleware';
import { isSwaggerPath } from './swagger-ui';

type Bucket = { count: number; resetAt: number };
type Policy = 'auth' | 'refresh' | 'general';

/**
 * Nest parity of C# RateLimitingMiddleware (in-memory fixed window).
 * Env:
 *   RATE_LIMIT_ENABLED
 *   RATE_LIMIT_PERMIT (general, default 1000)
 *   RATE_LIMIT_AUTH_PERMIT (default 10)
 *   RATE_LIMIT_REFRESH_PERMIT (default 60)
 *   RATE_LIMIT_WINDOW_SECONDS (default 60)
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly buckets = new Map<string, Bucket>();
  private readonly enabled =
    (process.env.RATE_LIMIT_ENABLED ?? 'true').toLowerCase() !== 'false';
  private readonly windowSeconds = Math.max(
    1,
    Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60),
  );
  private readonly permits: Record<Policy, number> = {
    general: Math.max(1, Number(process.env.RATE_LIMIT_PERMIT ?? 1000)),
    auth: Math.max(1, Number(process.env.RATE_LIMIT_AUTH_PERMIT ?? 10)),
    refresh: Math.max(1, Number(process.env.RATE_LIMIT_REFRESH_PERMIT ?? 60)),
  };

  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.path || req.url || '';
    if (!this.enabled || isHealthPath(path) || isSwaggerPath(path)) {
      next();
      return;
    }

    const policy = policyKey(req.path || '');
    const permit = this.permits[policy];
    const key = `${clientKey(req)}|${policy}`;
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + this.windowSeconds * 1000 };
      this.buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > permit) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      this.logger.warn(`Rate limit exceeded for ${key} (limit=${permit})`);
      res.status(429).send('Rate limit exceeded. Please try again later.');
      return;
    }

    next();
  }
}

function clientKey(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function policyKey(path: string): Policy {
  const p = path.toLowerCase();
  if (p.includes('/api/auth/refresh')) return 'refresh';
  if (p.includes('/api/auth/login') || p.includes('/api/auth/token')) return 'auth';
  return 'general';
}
