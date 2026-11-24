//! Nest `KafkaPublishInterceptor` / C# `KafkaPublishFilter` parity.

use axum::body::{to_bytes, Body};
use axum::extract::Request;
use axum::middleware::Next;
use axum::response::Response;
use chrono::Utc;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::time::Instant;
use tracing::{debug, error};
use uuid::Uuid;

use super::catalog;
use super::outbox::{global_outbox, OutboxMessage};
use super::redactor::{redact_headers, redact_sensitive};
use crate::auditing::is_health_path;

pub async fn kafka_publish(req: Request, next: Next) -> Response {
    let path = req.uri().path().to_string();
    if is_excluded_path(&path) {
        return next.run(req).await;
    }

    let method = req.method().as_str().to_string();
    let hit = catalog::find(&method, &path).await;
    let Some(hit) = hit else {
        return next.run(req).await;
    };

    let correlation_id = resolve_correlation_id(req.headers());
    let req_headers = header_map_to_json(req.headers());

    let (parts, body) = req.into_parts();
    let req_bytes = match to_bytes(body, 2 * 1024 * 1024).await {
        Ok(b) => b,
        Err(e) => {
            error!("Kafka: failed to buffer request body: {e}");
            return Response::builder()
                .status(500)
                .body(Body::from("request body error"))
                .unwrap_or_else(|_| Response::new(Body::empty()));
        }
    };
    let req_body_json = bytes_to_json(&req_bytes);
    let req = Request::from_parts(parts, Body::from(req_bytes));

    let started = Instant::now();
    let response = next.run(req).await;
    let elapsed_ms = started.elapsed().as_millis() as i64;
    let status = response.status().as_u16();

    // C#: only publish successful domain writes (avoid spam on 4xx/5xx).
    if status >= 400 {
        return response;
    }

    let (parts, body) = response.into_parts();
    let resp_bytes = match to_bytes(body, 4 * 1024 * 1024).await {
        Ok(b) => b,
        Err(e) => {
            error!("Kafka: failed to buffer response body: {e}");
            return Response::from_parts(parts, Body::empty());
        }
    };
    let resp_body_json = bytes_to_json(&resp_bytes);
    let resp_headers = header_map_to_json(&parts.headers);
    let response = Response::from_parts(parts, Body::from(resp_bytes.clone()));

    let topic = hit.topic_name.clone();
    let key = build_stable_key(&method, &path, &correlation_id, &resp_body_json);
    let envelope = json!({
        "correlationId": correlation_id,
        "requestInfo": {
            "path": path,
            "method": method,
            "headers": redact_headers(req_headers),
            "body": redact_sensitive(req_body_json),
        },
        "responseInfo": {
            "statusCode": status,
            "headers": redact_headers(resp_headers),
            "body": redact_sensitive(resp_body_json),
        },
        "exceptionMessage": "",
        "elapsedMilliseconds": elapsed_ms,
        "timestamp": Utc::now().to_rfc3339(),
    });

    // C# `KafkaPublishFilter`: enqueue to the outbox; the background dispatcher produces + retries.
    let message = OutboxMessage::new(topic.clone(), key.clone(), envelope.to_string(), Some(correlation_id));
    let outbox_id = message.id;
    global_outbox().enqueue(message);
    debug!("Kafka outbox enqueued. Id={outbox_id} Topic={topic} Key={key}");

    response
}

fn is_excluded_path(path: &str) -> bool {
    if path.is_empty() {
        return true;
    }
    let p = path.to_lowercase();
    is_health_path(&p)
        || p.starts_with("/swagger")
        || p.starts_with("/favicon")
        || p.contains("/kafka-events")
        || p.starts_with("/metrics")
}

fn resolve_correlation_id(headers: &axum::http::HeaderMap) -> String {
    for name in ["x-correlation-id", "x-request-id"] {
        if let Some(v) = headers.get(name).and_then(|v| v.to_str().ok()) {
            let t = v.trim();
            if !t.is_empty() {
                return t.to_string();
            }
        }
    }
    Uuid::new_v4().simple().to_string()
}

fn header_map_to_json(headers: &axum::http::HeaderMap) -> HashMap<String, Value> {
    let mut map = HashMap::new();
    for (k, v) in headers.iter() {
        let val = v.to_str().unwrap_or("").to_string();
        map.insert(k.as_str().to_string(), Value::String(val));
    }
    map
}

fn bytes_to_json(bytes: &[u8]) -> Value {
    if bytes.is_empty() {
        return json!({});
    }
    match serde_json::from_slice::<Value>(bytes) {
        Ok(Value::Object(o)) => Value::Object(o),
        Ok(other) => json!({ "return": other }),
        Err(_) => json!({
            "error": "Invalid JSON format",
            "value": String::from_utf8_lossy(bytes),
        }),
    }
}

fn build_stable_key(method: &str, path: &str, correlation_id: &str, body: &Value) -> String {
    let business_id = body
        .get("id")
        .or_else(|| body.get("Id"))
        .and_then(|v| v.as_str().map(|s| s.to_string()).or_else(|| {
            v.as_i64().map(|n| n.to_string())
                .or_else(|| v.as_u64().map(|n| n.to_string()))
        }));
    if let Some(id) = business_id.filter(|s| !s.is_empty()) {
        return format!("{method}|{path}|{id}");
    }
    format!("{method}|{path}|{correlation_id}")
}
