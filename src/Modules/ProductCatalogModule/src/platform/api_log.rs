use axum::body::Body;
use axum::http::Request;
use axum::middleware::Next;
use axum::response::Response;
use crate::auditing::is_health_path;

/// Nest ApiLogMiddleware parity — structured timing (+ Elastic when configured).
pub async fn api_log(req: Request<Body>, next: Next) -> Response {
    let path = req.uri().path().to_string();
    if is_health_path(&path) || path.starts_with("/swagger") {
        return next.run(req).await;
    }

    let method = req.method().to_string();
    let client_ip = crate::platform::client_ip(&req);
    let started = std::time::Instant::now();
    let request_datetime = chrono::Utc::now().to_rfc3339();

    let response = next.run(req).await;
    let status = response.status().as_u16();
    let elapsed = started.elapsed().as_millis();
    let api_log = serde_json::json!({
        "hostName": path,
        "clientIp": client_ip,
        "httpStatusCode": status.to_string(),
        "elapsedTime": elapsed,
        "requestDatetime": request_datetime,
        "responseDatetime": chrono::Utc::now().to_rfc3339(),
        "method": method,
        "message": "Api Log Message",
        "level": "Information",
    });
    tracing::info!("Api Log Message: {api_log}");
    if let Some(obj) = api_log.as_object() {
        crate::platform::observability::write_elastic_log(obj.clone());
    }
    crate::platform::observability::record_http_request(&method, status);

    response
}
