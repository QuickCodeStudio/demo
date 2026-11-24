"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrometheusExporter = getPrometheusExporter;
exports.startObservability = startObservability;
const common_1 = require("@nestjs/common");
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const resources_1 = require("@opentelemetry/resources");
let sdk = null;
let prometheusExporter = null;
function getPrometheusExporter() {
    return prometheusExporter;
}
async function startObservability(serviceName) {
    if (process.env.SWAGGER_DUMP === '1')
        return;
    if ((process.env.OTEL_ENABLED ?? 'true').toLowerCase() === 'false')
        return;
    if (sdk)
        return;
    const logger = new common_1.Logger('Observability');
    const otlpEndpoint = process.env.Otlp__Endpoint ||
        process.env.OTLP_ENDPOINT ||
        'http://localhost:4317';
    const httpTracesUrl = toOtlpHttpTracesUrl(otlpEndpoint);
    prometheusExporter = new exporter_prometheus_1.PrometheusExporter({
        preventServerStart: true,
    });
    sdk = new sdk_node_1.NodeSDK({
        resource: new resources_1.Resource({
            'service.name': serviceName,
        }),
        traceExporter: new exporter_trace_otlp_http_1.OTLPTraceExporter({ url: httpTracesUrl }),
        metricReader: prometheusExporter,
        instrumentations: [
            (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                '@opentelemetry/instrumentation-fs': { enabled: false },
            }),
        ],
    });
    await sdk.start();
    logger.log(`OpenTelemetry started (traces → ${httpTracesUrl}; Prometheus via GET /metrics)`);
    const shutdown = async () => {
        try {
            await sdk?.shutdown();
        }
        catch {
        }
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
}
function toOtlpHttpTracesUrl(endpoint) {
    const trimmed = endpoint.trim().replace(/\/+$/, '');
    if (trimmed.includes('/v1/traces'))
        return trimmed;
    try {
        const u = new URL(trimmed);
        if (u.port === '4317')
            u.port = '4318';
        if (!u.port && trimmed.includes(':4317')) {
            return trimmed.replace(':4317', ':4318') + '/v1/traces';
        }
        return `${u.origin}/v1/traces`;
    }
    catch {
        return `${trimmed}/v1/traces`;
    }
}
//# sourceMappingURL=otel-bootstrap.js.map