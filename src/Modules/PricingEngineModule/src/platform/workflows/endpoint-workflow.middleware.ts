import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger, NestMiddleware, Optional } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { EndpointWorkflowExecutor } from './endpoint-workflow.executor';
import { EndpointWorkflowRegistry } from './endpoint-workflow.registry';
import {
  IDEMPOTENCY_STORE,
  IdempotencyStore,
  sharedInMemoryIdempotencyStore,
} from './in-memory-idempotency-store';

const MAX_BODY_BYTES = 1024 * 1024;

/**
 * Nest parity of C# ModuleEndpointWorkflowMiddleware.
 * Matches method + path against the generated registry and returns the workflow output.
 * Honors `Idempotency-Key` / `X-Idempotency-Key`: 200 and 502 responses are cached and replayed
 * (with `X-Idempotency-Replayed: true`); unexpected 500 errors are never cached.
 * Register AFTER GatewayJwtMiddleware (C# UseModuleEndpointWorkflows after auth).
 */
@Injectable()
export class EndpointWorkflowMiddleware implements NestMiddleware {
  private readonly logger = new Logger(EndpointWorkflowMiddleware.name);

  private readonly idempotencyStore: IdempotencyStore;

  constructor(
    private readonly registry: EndpointWorkflowRegistry,
    private readonly executor: EndpointWorkflowExecutor,
    @Optional() @Inject(IDEMPOTENCY_STORE) idempotencyStore?: IdempotencyStore,
  ) {
    this.idempotencyStore = idempotencyStore ?? sharedInMemoryIdempotencyStore;
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const path = (req.path || req.url || '').split('?')[0];
    if (shouldSkip(path)) {
      next();
      return;
    }

    const match = this.registry.find(req.method, path);
    if (!match) {
      next();
      return;
    }

    const { entry } = match;
    const correlationId = resolveCorrelationId(req);
    res.setHeader('X-Correlation-Id', correlationId);

    const idempotencyKey = resolveIdempotencyKey(req, entry.name);
    if (idempotencyKey) {
      const cached = await this.tryGetCached(idempotencyKey);
      if (cached) {
        res.status(cached.statusCode);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Idempotency-Replayed', 'true');
        res.send(cached.body);
        return;
      }
    }

    try {
      const input = await buildInput(req, match.pathParameters, correlationId);
      const result = await this.executor.execute(entry, input, correlationId);

      if (!result.success) {
        await this.writeAndCache(res, idempotencyKey, correlationId, 502, {
          error: 'Endpoint workflow failed',
          workflow: entry.name,
          correlationId,
          sagaId: result.sagaId,
          compensatedSteps: result.compensatedSteps ?? [],
          steps: result.steps,
        });
        return;
      }

      await this.writeAndCache(
        res,
        idempotencyKey,
        correlationId,
        200,
        result.hasOutput ? result.output : result.steps,
      );
    } catch (err) {
      this.logger.error(
        `Endpoint workflow ${entry.name} execution failed (correlation ${correlationId}): ${
          err instanceof Error ? err.message : String(err)
        }`,
        err instanceof Error ? err.stack : undefined,
      );
      // Unexpected errors are intentionally NOT cached (C# parity) so the client can retry.
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Endpoint workflow execution error',
          workflow: entry.name,
          correlationId,
        });
      }
    }
  }

  private async tryGetCached(key: string) {
    try {
      return await this.idempotencyStore.tryGet(key);
    } catch (err) {
      this.logger.warn(`Idempotency lookup failed for ${key}: ${errMessage(err)}`);
      return undefined;
    }
  }

  /** C# WriteAndCacheAsync: write the JSON response, then record it for replay when a key was supplied. */
  private async writeAndCache(
    res: Response,
    idempotencyKey: string | undefined,
    correlationId: string,
    statusCode: number,
    payload: unknown,
  ): Promise<void> {
    res.status(statusCode).json(payload);
    if (!idempotencyKey) return;
    try {
      await this.idempotencyStore.save({
        key: idempotencyKey,
        statusCode,
        body: JSON.stringify(payload) ?? 'null',
        correlationId,
      });
    } catch (err) {
      this.logger.warn(`Idempotency save failed for ${idempotencyKey}: ${errMessage(err)}`);
    }
  }
}

export function shouldSkip(path: string | undefined): boolean {
  if (!path || path === '/') return true;
  const lower = path.toLowerCase();
  return (
    lower.startsWith('/hc') ||
    lower.startsWith('/health') ||
    lower.startsWith('/metrics') ||
    lower.startsWith('/swagger') ||
    lower.startsWith('/favicon')
  );
}

function headerValue(req: Request, name: string): string | undefined {
  const v = req.headers?.[name];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : undefined;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** C# ResolveIdempotencyKey: `endpoint|{workflowName}|{raw}` from Idempotency-Key or X-Idempotency-Key. */
function resolveIdempotencyKey(req: Request, workflowName: string): string | undefined {
  const raw = headerValue(req, 'idempotency-key') ?? headerValue(req, 'x-idempotency-key');
  return raw ? `endpoint|${workflowName}|${raw}` : undefined;
}

function resolveCorrelationId(req: Request): string {
  return (
    headerValue(req, 'x-correlation-id') ??
    headerValue(req, 'x-request-id') ??
    randomUUID().replace(/-/g, '')
  );
}

async function buildInput(
  req: Request,
  pathParameters: Record<string, string>,
  correlationId: string,
): Promise<Record<string, unknown>> {
  const root: Record<string, unknown> = { CorrelationId: correlationId };

  for (const [key, value] of Object.entries(req.query ?? {})) {
    if (!key) continue;
    root[key] = Array.isArray(value) ? value.join(',') : String(value ?? '');
  }
  for (const [key, value] of Object.entries(pathParameters)) {
    if (key) root[key] = value;
  }

  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'DELETE') return root;

  const body = await readBody(req);
  if (body === undefined || body === null || body === '') return root;
  if (typeof body === 'object' && !Array.isArray(body)) {
    Object.assign(root, body);
  } else {
    root.body = body;
  }
  return root;
}

/** Uses the already-parsed body when present; otherwise reads the raw stream (we run before Nest body parsers). */
async function readBody(req: Request): Promise<unknown> {
  const parsed = (req as any).body;
  if (parsed !== undefined && !(typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length === 0)) {
    return parsed;
  }
  if (!req.readable || typeof (req as any).on !== 'function') return undefined;

  const text = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer | string) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buf.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(buf);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
