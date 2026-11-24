import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
export declare function getPrometheusExporter(): PrometheusExporter | null;
export declare function startObservability(serviceName: string): Promise<void>;
