//! Nest `EndpointWorkflowMiddleware` / C# `ModuleEndpointWorkflowMiddleware` parity (HTTP-step subset).
//! Matches method + path against the generated registry and returns the workflow output.
//! Layer AFTER `gateway_jwt` (C# `UseModuleEndpointWorkflows` runs after auth).

use axum::body::{to_bytes, Body};
use axum::extract::{Request, State};
use axum::http::header::CONTENT_TYPE;
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::{json, Map, Value};
use std::sync::Arc;
use tracing::{error, info};
use uuid::Uuid;

use super::idempotency::IdempotencyRecord;
use super::EndpointWorkflowRuntime;
use crate::platform::AppState;

const MAX_BODY_BYTES: usize = 1024 * 1024;

/// `AppState`-based entry (used by `main.rs`); delegates to [`endpoint_workflows_runtime`].
pub async fn endpoint_workflows(
    State(state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> Response {
    handle(&state.workflows, req, next).await
}

/// Same middleware keyed on the runtime directly (no DB pool needed — used by tests / embedders).
pub async fn endpoint_workflows_runtime(
    State(runtime): State<Arc<EndpointWorkflowRuntime>>,
    req: Request<Body>,
    next: Next,
) -> Response {
    handle(&runtime, req, next).await
}

async fn handle(runtime: &EndpointWorkflowRuntime, req: Request<Body>, next: Next) -> Response {
    let path = req.uri().path().to_string();
    if should_skip(&path) {
        return next.run(req).await;
    }

    let method = req.method().clone();
    let Some(hit) = runtime.registry.find(method.as_str(), &path) else {
        return next.run(req).await;
    };

    let entry = hit.entry.clone();
    let correlation_id = resolve_correlation_id(req.headers());
    info!(
        "Endpoint workflow {} matched {} {} (correlation {correlation_id})",
        entry.name, method, path
    );

    // C# `ResolveIdempotencyKey`: replay a previously cached 200 / 502 for the same key.
    let idempotency_key = resolve_idempotency_key(req.headers(), &entry.name);
    if let Some(key) = &idempotency_key {
        if let Some(cached) = runtime.idempotency.try_get(key) {
            info!(
                "Endpoint workflow {} replayed from idempotency cache (correlation {correlation_id})",
                entry.name
            );
            let status = StatusCode::from_u16(cached.status_code).unwrap_or(StatusCode::OK);
            let mut response = raw_json_response(status, cached.body);
            response
                .headers_mut()
                .insert("x-idempotency-replayed", HeaderValue::from_static("true"));
            return with_correlation(response, &correlation_id);
        }
    }

    let input = match build_input(req, &method, hit.path_parameters, &correlation_id).await {
        Ok(input) => input,
        Err(e) => {
            error!(
                "Endpoint workflow {} input failed (correlation {correlation_id}): {e}",
                entry.name
            );
            return with_correlation(
                json_response(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    json!({
                        "error": "Endpoint workflow execution error",
                        "workflow": entry.name,
                        "correlationId": correlation_id,
                    }),
                ),
                &correlation_id,
            );
        }
    };

    let response = match runtime.executor.execute(&entry, input, &correlation_id).await {
        Ok(result) if result.success => {
            let body = match (result.has_output, result.output) {
                (true, Some(output)) => output,
                _ => Value::Object(result.steps),
            };
            cache_and_respond(
                runtime,
                idempotency_key.as_deref(),
                &correlation_id,
                StatusCode::OK,
                body,
            )
        }
        Ok(result) => cache_and_respond(
            runtime,
            idempotency_key.as_deref(),
            &correlation_id,
            StatusCode::BAD_GATEWAY,
            json!({
                "error": "Endpoint workflow failed",
                "workflow": entry.name,
                "correlationId": correlation_id,
                "sagaId": result.saga_id,
                "compensatedSteps": result.compensated_steps,
                "steps": result.steps,
            }),
        ),
        // 500s are never cached so the caller can retry with the same key.
        Err(e) => {
            error!(
                "Endpoint workflow {} execution failed (correlation {correlation_id}): {e:#}",
                entry.name
            );
            json_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                json!({
                    "error": "Endpoint workflow execution error",
                    "workflow": entry.name,
                    "correlationId": correlation_id,
                }),
            )
        }
    };
    with_correlation(response, &correlation_id)
}

/// Serializes `body`, saves it under `key` (when present), and builds the JSON response.
fn cache_and_respond(
    runtime: &EndpointWorkflowRuntime,
    key: Option<&str>,
    correlation_id: &str,
    status: StatusCode,
    body: Value,
) -> Response {
    let text = body.to_string();
    if let Some(key) = key {
        runtime.idempotency.save(IdempotencyRecord::new(
            key,
            status.as_u16(),
            text.clone(),
            Some(correlation_id.to_string()),
        ));
    }
    raw_json_response(status, text)
}

/// `Idempotency-Key` then `X-Idempotency-Key` → `endpoint|{workflow}|{raw}`; blank values are ignored.
fn resolve_idempotency_key(headers: &HeaderMap, workflow_name: &str) -> Option<String> {
    ["idempotency-key", "x-idempotency-key"].iter().find_map(|name| {
        headers
            .get(*name)
            .and_then(|v| v.to_str().ok())
            .map(str::trim)
            .filter(|v| !v.is_empty())
            .map(|raw| format!("endpoint|{workflow_name}|{raw}"))
    })
}

fn raw_json_response(status: StatusCode, body: String) -> Response {
    let mut response = Response::new(Body::from(body));
    *response.status_mut() = status;
    response
        .headers_mut()
        .insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    response
}

/// Same exclusions as Nest `shouldSkip` / C# middleware.
pub fn should_skip(path: &str) -> bool {
    if path.is_empty() || path == "/" {
        return true;
    }
    let lower = path.to_lowercase();
    ["/hc", "/health", "/metrics", "/swagger", "/favicon"]
        .iter()
        .any(|p| lower.starts_with(p))
}

fn json_response(status: StatusCode, body: Value) -> Response {
    (status, Json(body)).into_response()
}

fn with_correlation(mut response: Response, correlation_id: &str) -> Response {
    if let Ok(v) = HeaderValue::from_str(correlation_id) {
        response.headers_mut().insert("x-correlation-id", v);
    }
    response
}

fn resolve_correlation_id(headers: &HeaderMap) -> String {
    for name in ["x-correlation-id", "x-request-id"] {
        if let Some(v) = headers.get(name).and_then(|v| v.to_str().ok()) {
            let t = v.trim();
            if !t.is_empty() && HeaderValue::from_str(t).is_ok() {
                return t.to_string();
            }
        }
    }
    Uuid::new_v4().simple().to_string()
}

/// Input root (C# parity): `CorrelationId`, query params, path params, then JSON body fields flattened.
async fn build_input(
    req: Request<Body>,
    method: &Method,
    path_parameters: std::collections::HashMap<String, String>,
    correlation_id: &str,
) -> anyhow::Result<Map<String, Value>> {
    let mut root = Map::new();
    root.insert("CorrelationId".into(), Value::String(correlation_id.to_string()));

    if let Some(query) = req.uri().query() {
        let mut seen: Vec<(String, Vec<String>)> = Vec::new();
        for (k, v) in url::form_urlencoded::parse(query.as_bytes()) {
            if k.is_empty() {
                continue;
            }
            match seen.iter_mut().find(|(name, _)| *name == k) {
                Some((_, values)) => values.push(v.into_owned()),
                None => seen.push((k.into_owned(), vec![v.into_owned()])),
            }
        }
        for (k, values) in seen {
            root.insert(k, Value::String(values.join(",")));
        }
    }
    for (k, v) in path_parameters {
        if !k.is_empty() {
            root.insert(k, Value::String(v));
        }
    }

    if matches!(*method, Method::GET | Method::HEAD | Method::DELETE) {
        return Ok(root);
    }

    let bytes = to_bytes(req.into_body(), MAX_BODY_BYTES)
        .await
        .map_err(|e| anyhow::anyhow!("request body: {e}"))?;
    let text = String::from_utf8_lossy(&bytes);
    if text.trim().is_empty() {
        return Ok(root);
    }
    match serde_json::from_str::<Value>(&text) {
        Ok(Value::Object(o)) => root.extend(o),
        Ok(other) => {
            root.insert("body".into(), other);
        }
        Err(_) => {
            root.insert("body".into(), Value::String(text.into_owned()));
        }
    }
    Ok(root)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn skips_infrastructure_paths() {
        for p in ["", "/", "/hc", "/health", "/health/ready", "/metrics", "/Swagger/index.html", "/favicon.ico"] {
            assert!(should_skip(p), "{p} should be skipped");
        }
        for p in ["/api/orders", "/api/hc"] {
            assert!(!should_skip(p), "{p} should not be skipped");
        }
    }

    #[test]
    fn correlation_id_prefers_header() {
        let mut h = HeaderMap::new();
        assert_eq!(resolve_correlation_id(&h).len(), 32);
        h.insert("x-request-id", HeaderValue::from_static("req-1"));
        assert_eq!(resolve_correlation_id(&h), "req-1");
        h.insert("x-correlation-id", HeaderValue::from_static("corr-1"));
        assert_eq!(resolve_correlation_id(&h), "corr-1");
    }

    // ── Idempotency-Key replay (integration style: real axum server + mock downstream) ──

    use crate::platform::workflows::{EndpointWorkflowEntry, EndpointWorkflowRegistry};
    use axum::middleware::from_fn_with_state;
    use std::sync::atomic::{AtomicUsize, Ordering};

    #[test]
    fn idempotency_key_resolution_prefers_primary_header_and_ignores_blank() {
        let mut h = HeaderMap::new();
        assert_eq!(resolve_idempotency_key(&h, "wf"), None);
        h.insert("idempotency-key", HeaderValue::from_static("   "));
        assert_eq!(resolve_idempotency_key(&h, "wf"), None);
        h.insert("x-idempotency-key", HeaderValue::from_static(" abc "));
        assert_eq!(resolve_idempotency_key(&h, "wf").as_deref(), Some("endpoint|wf|abc"));
        h.insert("idempotency-key", HeaderValue::from_static("primary"));
        assert_eq!(resolve_idempotency_key(&h, "wf").as_deref(), Some("endpoint|wf|primary"));
    }

    struct Harness {
        base: String,
        downstream_hits: Arc<AtomicUsize>,
        runtime: Arc<EndpointWorkflowRuntime>,
        client: reqwest::Client,
    }

    async fn serve(app: axum::Router) -> String {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, app).await.ok();
        });
        format!("http://{addr}")
    }

    fn entry(name: &str, path: &str, yaml: String) -> EndpointWorkflowEntry {
        EndpointWorkflowEntry {
            name: name.into(),
            module_name: "M".into(),
            endpoint_path: path.into(),
            http_method: "POST".into(),
            description: None,
            workflow_content: yaml,
            is_active: true,
        }
    }

    async fn harness() -> Harness {
        // Mock downstream HTTP service the workflow steps call; counts every hit.
        let downstream_hits = Arc::new(AtomicUsize::new(0));
        let hits = downstream_hits.clone();
        let mock = axum::Router::new().fallback(move |uri: axum::http::Uri| {
            let hits = hits.clone();
            async move {
                hits.fetch_add(1, Ordering::SeqCst);
                let code = if uri.path().starts_with("/fail") {
                    StatusCode::INTERNAL_SERVER_ERROR
                } else {
                    StatusCode::OK
                };
                (code, Json(json!({ "path": uri.path() })))
            }
        });
        let base = serve(mock).await;

        let ok_yaml = format!(
            "kind: endpoint\nname: ok-wf\nsteps:\n  call:\n    url: {base}/ok\n    method: POST\noutput:\n  done: \"true\"\n"
        );
        let fail_yaml = format!(
            "kind: endpoint\nname: fail-wf\nsteps:\n  reserve:\n    url: {base}/reserve\n    method: POST\n    compensate: undo\n    transitions:\n      - condition: default\n        action: ship\n  ship:\n    url: {base}/fail/ship\n    method: POST\n  undo:\n    url: {base}/undo\n    method: POST\n    transitions:\n      - condition: default\n        action: reserve\n"
        );
        let registry = EndpointWorkflowRegistry::from_entries(vec![
            entry("ok-wf", "/api/ok", ok_yaml),
            entry("fail-wf", "/api/fail", fail_yaml),
            entry("broken-wf", "/api/broken", "steps: [unterminated".into()),
        ]);
        let runtime = Arc::new(EndpointWorkflowRuntime::with_registry(registry));
        let app = axum::Router::new()
            .fallback(|| async { (StatusCode::NOT_FOUND, "no workflow") })
            .layer(from_fn_with_state(runtime.clone(), endpoint_workflows_runtime));
        Harness {
            base: serve(app).await,
            downstream_hits,
            runtime,
            client: reqwest::Client::new(),
        }
    }

    impl Harness {
        async fn post(&self, path: &str, header: Option<(&str, &str)>) -> reqwest::Response {
            let mut req = self.client.post(format!("{}{path}", self.base)).json(&json!({}));
            if let Some((k, v)) = header {
                req = req.header(k, v);
            }
            req.send().await.unwrap()
        }
    }

    #[tokio::test]
    async fn replays_cached_200_without_re_executing() {
        let h = harness().await;
        let first = h.post("/api/ok", Some(("Idempotency-Key", "k-1"))).await;
        assert_eq!(first.status(), 200);
        assert!(first.headers().get("x-idempotency-replayed").is_none());
        let first_body: Value = first.json().await.unwrap();
        assert_eq!(first_body, json!({ "done": true }));
        assert_eq!(h.downstream_hits.load(Ordering::SeqCst), 1);

        let second = h.post("/api/ok", Some(("X-Idempotency-Key", "k-1"))).await;
        // `X-Idempotency-Key` is an alias: same raw key + same workflow => replay.
        assert_eq!(second.status(), 200);
        assert_eq!(second.headers().get("x-idempotency-replayed").unwrap(), "true");
        assert_eq!(
            second.headers().get(CONTENT_TYPE).unwrap(),
            "application/json"
        );
        assert!(second.headers().get("x-correlation-id").is_some());
        assert_eq!(second.json::<Value>().await.unwrap(), first_body);
        assert_eq!(h.downstream_hits.load(Ordering::SeqCst), 1, "replay must not hit downstream");
        assert!(h.runtime.idempotency.try_get("endpoint|ok-wf|k-1").is_some());
    }

    #[tokio::test]
    async fn different_key_or_no_key_executes_again() {
        let h = harness().await;
        h.post("/api/ok", Some(("Idempotency-Key", "a"))).await;
        let other = h.post("/api/ok", Some(("Idempotency-Key", "b"))).await;
        assert!(other.headers().get("x-idempotency-replayed").is_none());
        let none = h.post("/api/ok", None).await;
        assert!(none.headers().get("x-idempotency-replayed").is_none());
        let none2 = h.post("/api/ok", None).await;
        assert!(none2.headers().get("x-idempotency-replayed").is_none());
        assert_eq!(h.downstream_hits.load(Ordering::SeqCst), 4);
        assert_eq!(h.runtime.idempotency.len(), 2, "requests without a key are not cached");
    }

    #[tokio::test]
    async fn caches_502_with_saga_details_and_replays_it() {
        let h = harness().await;
        let first = h.post("/api/fail", Some(("Idempotency-Key", "f-1"))).await;
        assert_eq!(first.status(), 502);
        let body: Value = first.json().await.unwrap();
        assert_eq!(body["error"], "Endpoint workflow failed");
        assert_eq!(body["workflow"], "fail-wf");
        assert_eq!(body["compensatedSteps"], json!(["undo"]));
        assert_eq!(body["sagaId"].as_str().unwrap().len(), 32);
        assert!(body["steps"].is_object());
        let hits_after_first = h.downstream_hits.load(Ordering::SeqCst);
        assert_eq!(hits_after_first, 3, "reserve + fail/ship + undo");

        let second = h.post("/api/fail", Some(("Idempotency-Key", "f-1"))).await;
        assert_eq!(second.status(), 502);
        assert_eq!(second.headers().get("x-idempotency-replayed").unwrap(), "true");
        assert_eq!(second.json::<Value>().await.unwrap(), body);
        assert_eq!(h.downstream_hits.load(Ordering::SeqCst), hits_after_first);
    }

    #[tokio::test]
    async fn does_not_cache_500() {
        let h = harness().await;
        let first = h.post("/api/broken", Some(("Idempotency-Key", "b-1"))).await;
        assert_eq!(first.status(), 500);
        assert!(h.runtime.idempotency.try_get("endpoint|broken-wf|b-1").is_none());
        let second = h.post("/api/broken", Some(("Idempotency-Key", "b-1"))).await;
        assert_eq!(second.status(), 500);
        assert!(second.headers().get("x-idempotency-replayed").is_none());
        assert!(h.runtime.idempotency.is_empty());
    }

    #[tokio::test]
    async fn key_is_scoped_per_workflow() {
        let h = harness().await;
        h.post("/api/ok", Some(("Idempotency-Key", "shared"))).await;
        let other = h.post("/api/fail", Some(("Idempotency-Key", "shared"))).await;
        assert_eq!(other.status(), 502);
        assert!(other.headers().get("x-idempotency-replayed").is_none());
    }
}
