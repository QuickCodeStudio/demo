use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use crate::auditing::is_health_path;

struct Bucket {
    count: u32,
    reset_at: Instant,
}

static BUCKETS: Lazy<Mutex<HashMap<String, Bucket>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

fn enabled() -> bool {
    !matches!(
        std::env::var("RATE_LIMIT_ENABLED")
            .unwrap_or_else(|_| "true".into())
            .to_lowercase()
            .as_str(),
        "false" | "0" | "no"
    )
}

fn window() -> Duration {
    let secs: u64 = std::env::var("RATE_LIMIT_WINDOW_SECONDS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(60)
        .max(1);
    Duration::from_secs(secs)
}

fn permit(policy: &str) -> u32 {
    match policy {
        "auth" => std::env::var("RATE_LIMIT_AUTH_PERMIT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(10)
            .max(1),
        "refresh" => std::env::var("RATE_LIMIT_REFRESH_PERMIT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(60)
            .max(1),
        _ => std::env::var("RATE_LIMIT_PERMIT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(1000)
            .max(1),
    }
}

fn policy_key(path: &str) -> &'static str {
    let p = path.to_lowercase();
    if p.contains("/api/auth/refresh") {
        "refresh"
    } else if p.contains("/api/auth/login") || p.contains("/api/auth/token") {
        "auth"
    } else {
        "general"
    }
}

/// Nest RateLimitMiddleware parity — fixed-window in-memory.
pub async fn rate_limit(req: Request<Body>, next: Next) -> Response {
    let path = req.uri().path().to_string();
    if !enabled() || is_health_path(&path) || path.to_lowercase().starts_with("/swagger") {
        return next.run(req).await;
    }

    let policy = policy_key(&path);
    let limit = permit(policy);
    let client = crate::platform::client_ip(&req);
    let key = format!("{client}|{policy}");
    let now = Instant::now();
    let win = window();

    let retry_after = {
        let mut map = BUCKETS.lock().unwrap();
        let bucket = map.entry(key.clone()).or_insert(Bucket {
            count: 0,
            reset_at: now + win,
        });
        if bucket.reset_at <= now {
            bucket.count = 0;
            bucket.reset_at = now + win;
        }
        bucket.count += 1;
        if bucket.count > limit {
            Some(((bucket.reset_at - now).as_secs()).max(1))
        } else {
            None
        }
    };

    if let Some(secs) = retry_after {
        tracing::warn!("Rate limit exceeded for {key} (limit={limit})");
        return (
            StatusCode::TOO_MANY_REQUESTS,
            [("Retry-After", secs.to_string())],
            "Rate limit exceeded. Please try again later.",
        )
            .into_response();
    }

    next.run(req).await
}
