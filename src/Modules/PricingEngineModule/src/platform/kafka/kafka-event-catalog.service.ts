import { Injectable, Logger } from '@nestjs/common';
import { createGatewayServiceToken } from '../gateway-jwt.middleware';
import { fetchWithRetry } from '../http/fetch-with-retry';

export interface KafkaEventEntry {
  topicName: string;
  urlPath: string;
  httpMethod: string;
  isActive: boolean;
}

/**
 * Nest parity of C# KafkaEventCatalog — loads active Kafka events from IdentityModule.
 */
@Injectable()
export class KafkaEventCatalogService {
  private readonly logger = new Logger(KafkaEventCatalogService.name);
  private cache: { at: number; entries: KafkaEventEntry[] } | null = null;
  private readonly ttlMs = 5 * 60 * 1000;

  async findAsync(httpMethod: string, path?: string): Promise<KafkaEventEntry | null> {
    if (!path) return null;
    const entries = await this.getEntries();
    const method = httpMethod.toUpperCase();
    for (const candidate of pathVariants(path)) {
      for (const e of entries) {
        if (!e.isActive) continue;
        if (e.httpMethod.toUpperCase() !== method) continue;
        if (pathMatches(e.urlPath, candidate)) {
          return {
            ...e,
            topicName: `${e.topicName}_${method.toLowerCase()}`,
          };
        }
      }
    }
    return null;
  }

  private async getEntries(): Promise<KafkaEventEntry[]> {
    if (this.cache && Date.now() - this.cache.at < this.ttlMs) {
      return this.cache.entries;
    }
    try {
      const loaded = await this.loadEvents();
      this.cache = { at: Date.now(), entries: loaded };
      return loaded;
    } catch (err) {
      this.logger.error('Failed to load Kafka event catalog', err as Error);
      return [];
    }
  }

  private async loadEvents(): Promise<KafkaEventEntry[]> {
    const baseUrl = (
      process.env.IDENTITY_MODULE_API ||
      process.env.QuickcodeClients__IdentityModuleApi ||
      ''
    ).trim();
    if (!baseUrl) {
      this.logger.warn(
        'IDENTITY_MODULE_API / QuickcodeClients__IdentityModuleApi not configured; Kafka catalog is empty',
      );
      return [];
    }

    const token = resolveCatalogBearerToken();
    if (!token) {
      this.logger.warn(
        'Kafka catalog auth missing: set GATEWAY_JWT_PRIVATE_KEY (preferred, same as C# modules via .env), or GATEWAY_SERVICE_BEARER / IDENTITY_SERVICE_BEARER',
      );
      return [];
    }

    const url = combine(baseUrl, 'api/identity-module/kafka-events/get-kafka-events');
    const res = await fetchWithRetry(
      url,
      { headers: { Authorization: `Bearer ${token}` } },
      { retries: 3, baseDelayMs: 1000 },
    );
    if (!res.ok) {
      throw new Error(`Kafka catalog HTTP ${res.status}`);
    }
    const raw = (await res.json()) as any[];
    return (raw ?? []).map((x) => ({
      topicName: String(x.topicName ?? x.TopicName ?? ''),
      urlPath: String(x.urlPath ?? x.UrlPath ?? ''),
      httpMethod: String(x.httpMethod ?? x.HttpMethod ?? ''),
      isActive: Boolean(x.isActive ?? x.IsActive ?? false),
    }));
  }
}

function resolveCatalogBearerToken(): string | null {
  const minted = createGatewayServiceToken('IdentityModule');
  if (minted) return minted;
  const fromEnv = (
    process.env.GATEWAY_SERVICE_BEARER ||
    process.env.IDENTITY_SERVICE_BEARER ||
    ''
  ).trim();
  return fromEnv || null;
}

function combine(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function pathVariants(path: string): string[] {
  const out = [path];
  const trimmed = path.replace(/\/+$/, '');
  if (trimmed && trimmed !== path) out.push(trimmed);
  if (path.startsWith('/')) out.push(path.slice(1));
  else out.push(`/${path}`);
  return out;
}

function pathMatches(template: string, path: string): boolean {
  const t = template.replace(/\/+$/, '').toLowerCase();
  const p = path.replace(/\/+$/, '').toLowerCase();
  if (t === p) return true;
  const tParts = t.split('/').filter(Boolean);
  const pParts = p.split('/').filter(Boolean);
  if (tParts.length !== pParts.length) return false;
  for (let i = 0; i < tParts.length; i++) {
    if (tParts[i].startsWith('{') && tParts[i].endsWith('}')) continue;
    if (tParts[i] !== pParts[i]) return false;
  }
  return true;
}
