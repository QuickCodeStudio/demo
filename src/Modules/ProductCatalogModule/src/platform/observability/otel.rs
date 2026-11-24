//! Nest `otel-bootstrap.ts` parity — OTLP HTTP traces + tracing-subscriber.
//! Prometheus stays on `GET /metrics` (existing `metrics.rs`); Nest also keeps a separate Prometheus path.

use once_cell::sync::OnceCell;
use opentelemetry::trace::TracerProvider as _;
use opentelemetry::KeyValue;
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::runtime::Tokio;
use opentelemetry_sdk::trace::TracerProvider;
use opentelemetry_sdk::Resource;
use tracing::{info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

static PROVIDER: OnceCell<TracerProvider> = OnceCell::new();

/// Install fmt + optional OTLP trace export (call once before serving).
pub fn start_observability(service_name: &str) {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    if std::env::var("SWAGGER_DUMP").ok().as_deref() == Some("1") {
        tracing_subscriber::fmt().with_env_filter(filter).init();
        return;
    }
    if matches!(
        std::env::var("OTEL_ENABLED")
            .unwrap_or_else(|_| "true".into())
            .to_lowercase()
            .as_str(),
        "false" | "0" | "no"
    ) {
        tracing_subscriber::fmt().with_env_filter(filter).init();
        return;
    }

    std::env::set_var("OTEL_SERVICE_NAME", service_name);

    let endpoint = std::env::var("Otlp__Endpoint")
        .or_else(|_| std::env::var("OTLP_ENDPOINT"))
        .or_else(|_| std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT"))
        .unwrap_or_else(|_| "http://localhost:4317".into());
    let http_traces_url = to_otlp_http_traces_url(&endpoint);

    match install_otlp(service_name, &http_traces_url, filter) {
        Ok(()) => info!(
            "OpenTelemetry started (traces → {http_traces_url}; Prometheus via GET /metrics)"
        ),
        Err(e) => {
            // Exporter build can fail offline; still serve with fmt logs.
            let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
            tracing_subscriber::fmt().with_env_filter(filter).init();
            warn!("OTEL OTLP init failed ({e:#}); continuing with fmt subscriber only");
        }
    }
}

fn install_otlp(service_name: &str, http_traces_url: &str, filter: EnvFilter) -> anyhow::Result<()> {
    let exporter = opentelemetry_otlp::SpanExporter::builder()
        .with_http()
        .with_endpoint(http_traces_url.to_string())
        .build()
        .map_err(|e| anyhow::anyhow!("OTLP SpanExporter: {e}"))?;

    let resource = Resource::new([KeyValue::new(
        "service.name",
        service_name.to_string(),
    )]);
    let provider = TracerProvider::builder()
        .with_batch_exporter(exporter, Tokio)
        .with_resource(resource)
        .build();
    let tracer = provider.tracer(service_name.to_string());
    let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);

    tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer())
        .with(telemetry)
        .init();

    let _ = PROVIDER.set(provider);
    Ok(())
}

/// Flush/shutdown OTLP provider (call after `axum::serve` returns).
pub fn shutdown_observability() {
    if let Some(provider) = PROVIDER.get() {
        if let Err(e) = provider.shutdown() {
            warn!("OTEL shutdown: {e}");
        }
    }
}

/// Nest `toOtlpHttpTracesUrl` — C# gRPC :4317 → OTLP HTTP :4318/v1/traces.
pub fn to_otlp_http_traces_url(endpoint: &str) -> String {
    let trimmed = endpoint.trim().trim_end_matches('/');
    if trimmed.contains("/v1/traces") {
        return trimmed.to_string();
    }
    if let Ok(mut u) = url::Url::parse(trimmed) {
        if u.port() == Some(4317) {
            let _ = u.set_port(Some(4318));
        }
        if u.path().is_empty() || u.path() == "/" {
            u.set_path("/v1/traces");
        } else if !u.path().ends_with("/v1/traces") {
            let base = u.path().trim_end_matches('/');
            u.set_path(&format!("{base}/v1/traces"));
        }
        return u.to_string();
    }
    if trimmed.contains(":4317") && !trimmed.contains(":4318") {
        return format!("{}/v1/traces", trimmed.replace(":4317", ":4318"));
    }
    format!("{trimmed}/v1/traces")
}

#[cfg(test)]
mod tests {
    use super::to_otlp_http_traces_url;

    #[test]
    fn normalizes_grpc_4317_to_http_traces() {
        assert_eq!(
            to_otlp_http_traces_url("http://localhost:4317"),
            "http://localhost:4318/v1/traces"
        );
    }

    #[test]
    fn keeps_explicit_traces_path() {
        assert_eq!(
            to_otlp_http_traces_url("http://collector:4318/v1/traces"),
            "http://collector:4318/v1/traces"
        );
    }
}
