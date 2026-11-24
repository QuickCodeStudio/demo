use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use serde_json::json;

/// Map panics / unexpected 5xx bodies toward application/problem+json when empty.
pub async fn problem_details_layer(req: Request<Body>, next: Next) -> Response {
    let response = next.run(req).await;
    let status = response.status();
    if status.is_server_error() {
        let (parts, body) = response.into_parts();
        let bytes = axum::body::to_bytes(body, 64 * 1024)
            .await
            .unwrap_or_default();
        if bytes.is_empty() {
            return (
                status,
                [(header::CONTENT_TYPE, "application/problem+json")],
                json!({
                    "type": "https://tools.ietf.org/html/rfc7807",
                    "title": status.canonical_reason().unwrap_or("Error"),
                    "status": status.as_u16(),
                    "detail": "An unexpected error occurred.",
                })
                .to_string(),
            )
                .into_response();
        }
        return Response::from_parts(parts, Body::from(bytes));
    }
    response
}

pub fn problem_json(status: StatusCode, detail: &str) -> Response {
    (
        status,
        [(header::CONTENT_TYPE, "application/problem+json")],
        json!({
            "type": "https://tools.ietf.org/html/rfc7807",
            "title": status.canonical_reason().unwrap_or("Error"),
            "status": status.as_u16(),
            "detail": detail,
        })
        .to_string(),
    )
        .into_response()
}
