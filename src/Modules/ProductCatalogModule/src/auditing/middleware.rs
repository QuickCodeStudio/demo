use super::audit_log::create_audit_log;
use crate::platform::AppState;
use axum::body::Body;
use axum::extract::State;
use axum::http::Request;
use axum::middleware::Next;
use axum::response::Response;
use uuid::Uuid;

pub fn is_health_path(path: &str) -> bool {
    let p = path.to_lowercase();
    p == "/hc"
        || p == "/health"
        || p.starts_with("/health/")
        || p == "/metrics"
        || p.starts_with("/metrics/")
}

fn header_str(req: &Request<Body>, name: &str) -> Option<String> {
    req.headers()
        .get(name)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

pub async fn security_audit(
    State(state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let path = req.uri().path().to_string();
    if is_health_path(&path) || path.to_lowercase().starts_with("/swagger") {
        return next.run(req).await;
    }

    let method = req.method().to_string();
    let user_agent = header_str(&req, axum::http::header::USER_AGENT.as_str()).unwrap_or_default();
    let ip = crate::platform::client_ip(&req);
    let correlation = header_str(&req, "x-correlation-id")
        .or_else(|| header_str(&req, "x-request-id"))
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let user_id = header_str(&req, "x-user-id").unwrap_or_else(|| "anonymous".to_string());
    let user_group = header_str(&req, "x-permission-group");
    let client_id = header_str(&req, "x-client-id");
    let token_use = header_str(&req, "x-token-use");
    let client_app = header_str(&req, "x-client-app");
    let started = std::time::Instant::now();

    let response = next.run(req).await;
    let status = response.status().as_u16() as i32;
    let duration_ms = started.elapsed().as_millis() as i64;

    if let Some(writer) = &state.audit {
        let mut change_parts = Vec::new();
        if let Some(tu) = &token_use {
            change_parts.push(format!("token_use={tu}"));
        }
        if let Some(app) = &client_app {
            change_parts.push(format!("client_app={app}"));
        }

        let mut log = create_audit_log("HttpRequest", &correlation, &method);
        log.user_id = Some(user_id);
        log.user_group = user_group;
        log.client_id = client_id.clone();
        log.duration_ms = Some(duration_ms);
        log.status_code = Some(status);
        log.request_module = std::env::var("MODULE_NAME").ok();
        log.request_path = Some(path.clone());
        log.ip_address = Some(ip);
        log.user_agent = Some(user_agent);
        log.correlation_id = Some(correlation);
        log.change_summary = if change_parts.is_empty() {
            None
        } else {
            Some(change_parts.join(";"))
        };
        log.is_success = status < 400;
        log.new_values = Some(
            serde_json::json!({
                "method": method,
                "path": path,
                "statusCode": status,
                "durationMs": duration_ms,
                "clientId": client_id,
            })
            .to_string(),
        );
        let w = writer.clone();
        tokio::spawn(async move {
            w.queue(log).await;
        });
    }

    response
}
