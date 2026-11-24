import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { isHealthPath } from '../auditing/security-audit.middleware';
import { writeElasticLog } from './observability/elastic-sink';

/**
 * Nest parity of C# ApiLogFilterAttribute — structured request timing log (+ Elastic when configured).
 */
@Injectable()
export class ApiLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger('ApiLog');

  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.path || req.url || '';
    if (isHealthPath(path) || path.startsWith('/swagger')) {
      next();
      return;
    }

    const started = Date.now();
    const requestDatetime = new Date().toISOString();

    res.on('finish', () => {
      const apiLog = {
        hostName: path,
        clientIp:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.ip ||
          'unknown',
        httpStatusCode: String(res.statusCode),
        elapsedTime: Date.now() - started,
        requestDatetime,
        responseDatetime: new Date().toISOString(),
        method: req.method,
      };
      this.logger.log(`Api Log Message: ${JSON.stringify(apiLog)}`);
      writeElasticLog({
        message: 'Api Log Message',
        level: 'Information',
        ...apiLog,
      });
    });

    next();
  }
}
