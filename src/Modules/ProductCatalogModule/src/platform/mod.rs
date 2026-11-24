mod health;
mod jwt;
mod headers;
mod swagger;
mod state;
mod rate_limit;
mod api_log;
mod problem;
mod cors;
pub mod http;
pub mod kafka;
pub mod observability;
pub mod workflows;

pub use health::health_routes;
pub use headers::security_headers;
pub use jwt::gateway_jwt;
pub use state::AppState;
pub use swagger::{rewrite_swagger_index, swagger_routes};
pub use rate_limit::rate_limit;
pub use api_log::api_log;
pub use problem::{problem_details_layer, problem_json};
pub use cors::build_cors;
pub use observability::metrics_routes;
pub use workflows::endpoint_workflows;

use axum::body::Body;
use axum::http::Request;

/// Trust X-Forwarded-For (YARP) — Nest `trust proxy` parity (P8).
pub fn client_ip(req: &Request<Body>) -> String {
    if let Some(xff) = req
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
    {
        if let Some(first) = xff.split(',').next() {
            let trimmed = first.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
    }
    if let Some(real) = req
        .headers()
        .get("x-real-ip")
        .and_then(|v| v.to_str().ok())
    {
        return real.to_string();
    }
    "unknown".into()
}
