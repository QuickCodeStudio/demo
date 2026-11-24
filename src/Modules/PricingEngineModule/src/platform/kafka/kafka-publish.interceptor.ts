import { randomUUID } from 'crypto';
import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Observable, mergeMap } from 'rxjs';
import { Request, Response } from 'express';
import { isHealthPath } from '../../auditing/security-audit.middleware';
import { KafkaEventCatalogService } from './kafka-event-catalog.service';
import { OUTBOX_STORE, OutboxStore, sharedInMemoryOutboxStore } from './in-memory-outbox-store';
import {
  redactSensitiveHeaders,
  redactSensitivePayload,
} from './sensitive-payload-redactor';

/**
 * Nest parity of C# KafkaPublishFilter — enqueue the request/response envelope to the outbox after the handler.
 * OutboxDispatcherService drains the outbox to Kafka in the background (C# OutboxDispatcherHostedService).
 * Only successful responses (status < 400) are enqueued; handler errors are never published.
 */
@Injectable()
export class KafkaPublishInterceptor implements NestInterceptor {
  private readonly logger = new Logger(KafkaPublishInterceptor.name);
  private readonly outbox: OutboxStore;

  constructor(
    private readonly catalog: KafkaEventCatalogService,
    @Optional() @Inject(OUTBOX_STORE) outbox?: OutboxStore,
  ) {
    this.outbox = outbox ?? sharedInMemoryOutboxStore;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const path = req.path || req.url || '';

    if (isExcludedPath(path)) {
      return next.handle();
    }

    const started = Date.now();
    const handler = typeof context.getHandler === 'function' ? context.getHandler() : undefined;
    // Errors propagate untouched: they are >= 400 and are never enqueued.
    return next.handle().pipe(
      mergeMap(async (body) => {
        await this.enqueueSafe(req, res, handler, body, Date.now() - started);
        return body;
      }),
    );
  }

  private async enqueueSafe(
    req: Request,
    res: Response,
    handler: unknown,
    body: unknown,
    elapsedMs: number,
  ): Promise<void> {
    try {
      const statusCode = resolveSuccessStatus(req, res, handler);
      if (statusCode >= 400) return;

      const path = req.path || req.url || '';
      const hit = await this.catalog.findAsync(req.method, path);
      if (!hit) return;

      const correlationId = resolveCorrelationId(req);
      const kafkaMessage = {
        correlationId,
        requestInfo: {
          path,
          method: req.method,
          headers: redactSensitiveHeaders(
            req.headers as Record<string, unknown>,
          ),
          body: redactSensitivePayload(req.body ?? {}),
        },
        responseInfo: {
          statusCode,
          headers: redactSensitiveHeaders(
            (typeof res.getHeaders === 'function' ? res.getHeaders() : {}) as Record<string, unknown>,
          ),
          body: redactSensitivePayload(body ?? {}),
        },
        exceptionMessage: '',
        elapsedMilliseconds: elapsedMs,
        timestamp: new Date().toISOString(),
      };

      const key = buildStableKey(req.method, path, correlationId, body);
      await this.outbox.enqueue({
        topic: hit.topicName,
        key,
        payload: JSON.stringify(kafkaMessage),
        correlationId,
      });
      this.logger.log(
        `Kafka outbox enqueued. Topic=${hit.topicName} Key=${key} CorrelationId=${correlationId}`,
      );
    } catch (err) {
      this.logger.error(
        `Kafka outbox enqueue failed. Path=${req.path}`,
        err as Error,
      );
    }
  }
}

/**
 * Nest applies the default status (201 for POST, `@HttpCode`) after interceptors run, so at this point
 * `res.statusCode` is usually still Express' default 200. Resolve the effective code the same way Nest will.
 */
function resolveSuccessStatus(req: Request, res: Response, handler: unknown): number {
  const current = res.statusCode;
  if (typeof current === 'number' && current !== HttpStatus.OK) return current;
  if (typeof handler === 'function') {
    const declared = Reflect.getMetadata(HTTP_CODE_METADATA, handler);
    if (typeof declared === 'number') return declared;
  }
  if (req.method?.toUpperCase() === 'POST') return HttpStatus.CREATED;
  return typeof current === 'number' ? current : HttpStatus.OK;
}

function resolveCorrelationId(req: Request): string {
  const header = (name: string): string | undefined => {
    const v = req.headers?.[name];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.trim() ? s.trim() : undefined;
  };
  return header('x-correlation-id') ?? header('x-request-id') ?? randomUUID().replace(/-/g, '');
}

/**
 * Prefer a stable business id from the response body; fall back to method|path|correlation
 * (C# BuildStableKey / Rust build_stable_key). Avoids always-unique keys that defeat consumer idempotency.
 */
export function buildStableKey(
  method: string,
  path: string,
  correlationId: string,
  body: unknown,
): string {
  let businessId: string | undefined;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    const raw = record.id ?? record.Id;
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'bigint') {
      const s = String(raw);
      if (s.trim()) businessId = s;
    }
  }
  return `${method}|${path}|${businessId ?? correlationId}`;
}

function isExcludedPath(path: string): boolean {
  if (!path) return true;
  const p = path.toLowerCase();
  return (
    isHealthPath(p) ||
    p.startsWith('/swagger') ||
    p.startsWith('/favicon') ||
    p.includes('/kafka-events')
  );
}
