import { Logger } from '@nestjs/common';

/**
 * Nest parity of C# Serilog.Sinks.Elasticsearch (best-effort fire-and-forget).
 * Env: ELASTIC_CONNECTION_STRING or Logging__ElasticConfiguration__Uri
 * Optional: Logging__ApiName (index prefix).
 */
const logger = new Logger('ElasticSink');

export function resolveElasticUri(): string | null {
  const raw = (
    process.env.ELASTIC_CONNECTION_STRING ||
    process.env.Logging__ElasticConfiguration__Uri ||
    ''
  ).trim();
  if (!raw || raw.includes('[{') || raw.includes(']')) return null;
  return raw.replace(/\/+$/, '');
}

export function writeElasticLog(document: Record<string, unknown>): void {
  const base = resolveElasticUri();
  if (!base) return;

  const apiName = (
    process.env.Logging__ApiName ||
    process.env.MODULE_NAME ||
    'quickcode-api'
  )
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-');
  const environment = (process.env.NODE_ENV || 'production')
    .toLowerCase()
    .replace(/\./g, '-');
  const day = new Date().toISOString().slice(0, 10);
  const index = `${apiName}--${environment}--${day}`;
  const url = `${base}/${index}/_doc`;

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      '@timestamp': new Date().toISOString(),
      ...document,
    }),
  }).catch((err) => {
    logger.warn(
      `Elasticsearch write failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  });
}
