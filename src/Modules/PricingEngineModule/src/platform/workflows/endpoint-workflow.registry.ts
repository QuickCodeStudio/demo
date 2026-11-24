import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Injectable, Logger } from '@nestjs/common';
import {
  ENDPOINT_WORKFLOW_DEFAULT_PATH,
  EndpointWorkflowEntry,
  EndpointWorkflowMatch,
} from './endpoint-workflow.types';

interface TemplateRoute {
  regex: RegExp;
  names: string[];
  entry: EndpointWorkflowEntry;
}

interface MethodBucket {
  exact: Map<string, EndpointWorkflowEntry>;
  templates: TemplateRoute[];
}

/** Lower-cased, query-less, single leading slash, no trailing slash (root stays `/`). */
export function normalizeWorkflowPath(path: string): string {
  const noQuery = (path.split('?')[0] ?? '').trim();
  const trimmed = noQuery.replace(/^\/+|\/+$/g, '');
  return '/' + trimmed;
}

/** `/api/orders/{id}` → regex + param names. Supports `{id}`, `{id:int}`, `{id?}`. */
function compileTemplate(template: string): { regex: RegExp; names: string[] } {
  const names: string[] = [];
  // Do not use normalizeWorkflowPath: splitting on `?` would eat `{id?}`.
  const trimmed = (template ?? '').trim().replace(/^\/+|\/+$/g, '');
  const segments = trimmed
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      const m = /^\{\*?([A-Za-z_][\w]*)(?::[^}?]*)?(\?)?\}$/.exec(segment);
      if (m) {
        names.push(m[1]);
        return m[2] ? '(?:/([^/]+))?' : '/([^/]+)';
      }
      return '/' + segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
  return { regex: new RegExp(`^${segments.join('')}/?$`, 'i'), names };
}

/**
 * In-process index of generated endpoint workflows (path + method → YAML).
 * Nest parity of C# ModuleEndpointWorkflowRegistry / EndpointWorkflowIndex.
 */
@Injectable()
export class EndpointWorkflowRegistry {
  private readonly logger = new Logger(EndpointWorkflowRegistry.name);
  private byMethod = new Map<string, MethodBucket>();
  private count = 0;

  constructor() {
    this.loadFromFile();
  }

  get size(): number {
    return this.count;
  }

  /** Reads the generated JSON registry (module root = process cwd when the API runs). */
  loadFromFile(filePath?: string): void {
    const target = resolve(
      filePath ||
        process.env.ENDPOINT_WORKFLOWS_PATH ||
        resolve(process.cwd(), ENDPOINT_WORKFLOW_DEFAULT_PATH),
    );
    if (!existsSync(target)) {
      this.register([]);
      return;
    }
    try {
      const raw = readFileSync(target, 'utf8').trim();
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      this.register(Array.isArray(parsed) ? (parsed as EndpointWorkflowEntry[]) : []);
      this.logger.log(`Loaded ${this.count} endpoint workflow(s) from ${target}`);
    } catch (err) {
      this.logger.error(
        `Failed to load endpoint workflows from ${target}: ${err instanceof Error ? err.message : String(err)}`,
      );
      this.register([]);
    }
  }

  /** Rebuilds the index; inactive / incomplete entries are skipped (C# EndpointWorkflowIndex.From). */
  register(entries: EndpointWorkflowEntry[]): void {
    const index = new Map<string, MethodBucket>();
    let count = 0;
    for (const entry of entries ?? []) {
      if (
        !entry ||
        entry.isActive !== true ||
        !entry.endpointPath?.trim() ||
        !entry.httpMethod?.trim() ||
        !entry.workflowContent?.trim()
      ) {
        continue;
      }
      const method = entry.httpMethod.trim().toUpperCase();
      let bucket = index.get(method);
      if (!bucket) {
        bucket = { exact: new Map(), templates: [] };
        index.set(method, bucket);
      }
      if (entry.endpointPath.includes('{')) {
        const { regex, names } = compileTemplate(entry.endpointPath);
        bucket.templates.push({ regex, names, entry });
      } else {
        bucket.exact.set(normalizeWorkflowPath(entry.endpointPath).toLowerCase(), entry);
      }
      count++;
    }
    this.byMethod = index;
    this.count = count;
  }

  find(httpMethod: string, path: string | undefined | null): EndpointWorkflowMatch | null {
    if (!path || !httpMethod) return null;
    const bucket = this.byMethod.get(httpMethod.toUpperCase());
    if (!bucket) return null;

    const normalized = normalizeWorkflowPath(path);
    const exact = bucket.exact.get(normalized.toLowerCase());
    if (exact) return { entry: exact, pathParameters: {} };

    for (const route of bucket.templates) {
      const m = route.regex.exec(normalized);
      if (!m) continue;
      const pathParameters: Record<string, string> = {};
      route.names.forEach((name, i) => {
        const value = m[i + 1];
        if (value !== undefined) pathParameters[name] = safeDecode(value);
      });
      return { entry: route.entry, pathParameters };
    }
    return null;
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
