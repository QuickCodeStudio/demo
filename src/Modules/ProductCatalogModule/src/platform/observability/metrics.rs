use axum::routing::get;
use axum::{Router, response::IntoResponse};
use once_cell::sync::Lazy;
use std::sync::atomic::{AtomicU64, Ordering};
use crate::platform::AppState;

static HTTP_REQUESTS: Lazy<AtomicU64> = Lazy::new(|| AtomicU64::new(0));
static HTTP_5XX: Lazy<AtomicU64> = Lazy::new(|| AtomicU64::new(0));

pub fn record_http_request(_method: &str, status: u16) {
    HTTP_REQUESTS.fetch_add(1, Ordering::Relaxed);
    if status >= 500 {
        HTTP_5XX.fetch_add(1, Ordering::Relaxed);
    }
}

async fn metrics() -> impl IntoResponse {
    let service = std::env::var("MODULE_NAME").unwrap_or_else(|_| "Template0ModuleName".into());
    let body = format!(
        "# HELP http_requests_total Total HTTP requests\n\
         # TYPE http_requests_total counter\n\
         http_requests_total{{service=\"{service}\"}} {}\n\
         # HELP http_server_errors_total Total HTTP 5xx responses\n\
         # TYPE http_server_errors_total counter\n\
         http_server_errors_total{{service=\"{service}\"}} {}\n",
        HTTP_REQUESTS.load(Ordering::Relaxed),
        HTTP_5XX.load(Ordering::Relaxed),
    );
    (
        [(axum::http::header::CONTENT_TYPE, "text/plain; version=0.0.4")],
        body,
    )
}

pub fn metrics_routes() -> Router<AppState> {
    Router::new().route("/metrics", get(metrics))
}
