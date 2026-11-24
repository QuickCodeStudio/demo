import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { isSwaggerPath } from './swagger-ui';

/**
 * Nest parity of C# SecurityHeadersMiddleware (API modules).
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    setIfAbsent(res, 'Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    setIfAbsent(res, 'X-Content-Type-Options', 'nosniff');
    // SAMEORIGIN + frame-ancestors 'self': Gateway dashboard iframes Swagger UI
    // through YARP (/swagger/{module}-api/index.html). 'none' / DENY blocks that.
    setIfAbsent(res, 'X-Frame-Options', 'SAMEORIGIN');
    setIfAbsent(res, 'X-XSS-Protection', '1; mode=block');
    setIfAbsent(res, 'Referrer-Policy', 'strict-origin-when-cross-origin');
    setIfAbsent(
      res,
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=()',
    );
    setIfAbsent(
      res,
      'Content-Security-Policy',
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: " +
        'https://ajax.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://gitcdn.github.io https://code.jquery.com; ' +
        "style-src 'self' 'unsafe-inline' " +
        'https://fonts.googleapis.com https://cdnjs.cloudflare.com https://gitcdn.github.io https://cdn.jsdelivr.net; ' +
        "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " +
        "img-src 'self' data: blob: https:; " +
        "worker-src 'self' blob:; " +
        "child-src 'self' blob:; " +
        "connect-src 'self'; " +
        "frame-src 'self' http://localhost:* https://localhost:* https://*.quickcode.net https://*.europe-west1.run.app; " +
        "frame-ancestors 'self';",
    );
    setIfAbsent(res, 'X-Permitted-Cross-Domain-Policies', 'none');
    setIfAbsent(res, 'X-Download-Options', 'noopen');
    setIfAbsent(res, 'X-DNS-Prefetch-Control', 'off');
    // Swagger UI blob workers fail under COEP require-corp when iframed by Gateway (no COEP).
    if (!isSwaggerPath(req.path || req.url || '')) {
      setIfAbsent(res, 'Cross-Origin-Embedder-Policy', 'require-corp');
      setIfAbsent(res, 'Cross-Origin-Opener-Policy', 'same-origin');
      setIfAbsent(res, 'Cross-Origin-Resource-Policy', 'same-origin');
    }
    next();
  }
}

function setIfAbsent(res: Response, name: string, value: string): void {
  if (!res.getHeader(name)) {
    res.setHeader(name, value);
  }
}
