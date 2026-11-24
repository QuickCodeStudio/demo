use tower_http::cors::{AllowOrigin, Any, CorsLayer};
use axum::http::{HeaderValue, Method};

/// Nest CORS allow-list + `*.domain` wildcard parity.
pub fn build_cors() -> CorsLayer {
    let origins = std::env::var("CORS_ALLOW_ORIGINS")
        .or_else(|_| std::env::var("CorsSettings__AllowOrigins"))
        .unwrap_or_default();
    let trimmed = origins.trim();
    if trimmed.is_empty() {
        tracing::warn!(
            "CORS_ALLOW_ORIGINS / CorsSettings__AllowOrigins is missing or empty; permissive CORS"
        );
        return CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any);
    }
    if trimmed.contains('*') && !trimmed.contains("*.") {
        return CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any);
    }

    let list: Vec<String> = trimmed
        .split([',', ';'])
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    let has_wildcard = list.iter().any(|o| o.starts_with("*."));
    if has_wildcard {
        let patterns = list.clone();
        return CorsLayer::new()
            .allow_origin(AllowOrigin::predicate(move |origin, _| {
                let Ok(o) = origin.to_str() else {
                    return false;
                };
                patterns.iter().any(|p| origin_matches(p, o))
            }))
            .allow_methods([
                Method::GET,
                Method::POST,
                Method::PUT,
                Method::PATCH,
                Method::DELETE,
                Method::OPTIONS,
            ])
            .allow_headers(Any);
    }

    let values: Vec<HeaderValue> = list
        .into_iter()
        .filter_map(|o| HeaderValue::from_str(&o).ok())
        .collect();
    CorsLayer::new()
        .allow_origin(AllowOrigin::list(values))
        .allow_methods(Any)
        .allow_headers(Any)
}

fn origin_matches(pattern: &str, origin: &str) -> bool {
    if pattern == origin {
        return true;
    }
    if let Some(suffix) = pattern.strip_prefix("*.") {
        // https://app.example.com matches *.example.com
        if let Some(host) = origin.split("://").nth(1) {
            let host = host.split('/').next().unwrap_or(host);
            return host == suffix || host.ends_with(&format!(".{suffix}"));
        }
    }
    false
}
