import { Logger } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';

/**
 * Nest parity of C# AddOpenTelemetry (OTLP traces + Prometheus metrics).
 * Call {@link startObservability} before NestFactory.create.
 */
let sdk: NodeSDK | null = null;
let prometheusExporter: PrometheusExporter | null = null;

export function getPrometheusExporter(): PrometheusExporter | null {
  return prometheusExporter;
}

export async function startObservability(serviceName: string): Promise<void> {
  if (process.env.SWAGGER_DUMP === '1') return;
  if ((process.env.OTEL_ENABLED ?? 'true').toLowerCase() === 'false') return;
  if (sdk) return;

  const logger = new Logger('Observability');
  const otlpEndpoint =
    process.env.Otlp__Endpoint ||
    process.env.OTLP_ENDPOINT ||
    'http://localhost:4317';

  // C# uses gRPC :4317; OTEL JS HTTP exporter expects :4318/v1/traces — normalize.
  const httpTracesUrl = toOtlpHttpTracesUrl(otlpEndpoint);

  prometheusExporter = new PrometheusExporter({
    preventServerStart: true,
  });

  sdk = new NodeSDK({
    resource: new Resource({
      'service.name': serviceName,
    }),
    traceExporter: new OTLPTraceExporter({ url: httpTracesUrl }),
    metricReader: prometheusExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  await sdk.start();
  logger.log(
    `OpenTelemetry started (traces → ${httpTracesUrl}; Prometheus via GET /metrics)`,
  );

  const shutdown = async () => {
    try {
      await sdk?.shutdown();
    } catch {
      /* ignore */
    }
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

function toOtlpHttpTracesUrl(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, '');
  if (trimmed.includes('/v1/traces')) return trimmed;
  try {
    const u = new URL(trimmed);
    // Classic collector: 4317=gRPC, 4318=HTTP
    if (u.port === '4317') u.port = '4318';
    if (!u.port && trimmed.includes(':4317')) {
      return trimmed.replace(':4317', ':4318') + '/v1/traces';
    }
    return `${u.origin}/v1/traces`;
  } catch {
    return `${trimmed}/v1/traces`;
  }
}
