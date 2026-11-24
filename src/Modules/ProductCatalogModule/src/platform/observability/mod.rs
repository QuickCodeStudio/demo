mod elastic;
mod metrics;
mod otel;

pub use elastic::write_elastic_log;
pub use metrics::{metrics_routes, record_http_request};
pub use otel::{shutdown_observability, start_observability};
