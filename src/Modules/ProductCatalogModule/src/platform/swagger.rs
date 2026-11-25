use axum::body::Body;
use axum::http::Request;
use axum::middleware::Next;
use axum::response::{Html, IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use once_cell::sync::Lazy;
use serde_json::{json, Value};
use crate::platform::AppState;

/// OpenAPI document written by the generator (`src/swagger_dump/swagger_openapi.json`).
/// Served live so Swagger UI / Gateway match Nest & NSwag clients.
/// Path must not be under `src/bin` — site `**/bin/` gitignore omits that tree from GitHub/CI.
static OPENAPI_DOC: Lazy<Value> = Lazy::new(|| {
    match serde_json::from_str::<Value>(include_str!("../swagger_dump/swagger_openapi.json")) {
        Ok(mut doc) => {
            // Keep live metadata in sync with env / QuickCode defaults.
            if let Some(info) = doc.get_mut("info").and_then(|v| v.as_object_mut()) {
                let title = format!(
                    "QuickCode - {} Api",
                    std::env::var("MODULE_NAME").unwrap_or_else(|_| "Template0ModuleName".into())
                );
                info.insert("title".into(), Value::String(title));
                info.entry("termsOfService".to_string())
                    .or_insert_with(|| Value::String("https://www.quickcode.net".into()));
                info.entry("contact".to_string()).or_insert_with(|| {
                    json!({ "name": "Üzeyir Apaydın", "url": "https://www.quickcode.net" })
                });
                info.entry("license".to_string()).or_insert_with(|| {
                    json!({ "name": "QuickCode.Net License", "url": "https://www.quickcode.net" })
                });
            }
            if let Some(components) = doc.get_mut("components").and_then(|v| v.as_object_mut()) {
                components.entry("securitySchemes".to_string()).or_insert_with(|| {
                    json!({
                        "Bearer": {
                            "type": "http",
                            "scheme": "bearer",
                            "bearerFormat": "Bearer",
                            "description": "Please enter a valid token"
                        }
                    })
                });
            }
            doc
        }
        Err(err) => {
            tracing::error!(?err, "failed to parse embedded swagger_openapi.json");
            empty_openapi()
        }
    }
});

fn empty_openapi() -> Value {
    json!({
        "openapi": "3.0.1",
        "info": {
            "title": format!("QuickCode - {} Api", std::env::var("MODULE_NAME").unwrap_or_else(|_| "Template0ModuleName".into())),
            "version": "v1",
            "termsOfService": "https://www.quickcode.net",
            "contact": { "name": "Üzeyir Apaydın", "url": "https://www.quickcode.net" },
            "license": { "name": "QuickCode.Net License", "url": "https://www.quickcode.net" }
        },
        "paths": {},
        "components": {
            "schemas": {},
            "securitySchemes": {
                "Bearer": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "Bearer",
                    "description": "Please enter a valid token"
                }
            }
        }
    })
}

async fn openapi_json() -> Json<Value> {
    Json(OPENAPI_DOC.clone())
}

/// Gateway CSP allows `cdn.jsdelivr.net` (not `unpkg.com`). Spec URL is derived from the
/// current path so YARP `/swagger/{module}-api/index.html` resolves `…/v1/swagger.json`.
async fn swagger_ui() -> Html<&'static str> {
    Html(r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>QuickCode API</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" crossorigin="anonymous" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin="anonymous"></script>
  <script>
    (function () {
      var path = window.location.pathname.replace(/\/index\.html$/i, '').replace(/\/$/, '');
      if (!path) path = '/swagger';
      var specUrl = path + '/v1/swagger.json';
      window.ui = SwaggerUIBundle({
        url: specUrl,
        dom_id: '#swagger-ui',
        persistAuthorization: true
      });
    })();
  </script>
</body>
</html>"#)
}

/// Gateway iframe uses `/swagger/index.html` (Swashbuckle); rewrite without redirect.
pub async fn rewrite_swagger_index(req: Request<Body>, next: Next) -> Response {
    let path = req.uri().path();
    if path == "/swagger/index.html" {
        return swagger_ui().await.into_response();
    }
    next.run(req).await
}

pub fn is_swagger_path(path: &str) -> bool {
    let pathname = path.split('?').next().unwrap_or(path).to_lowercase();
    pathname == "/swagger" || pathname.starts_with("/swagger/")
}

/// Swagger UI + JSON — Nest/Swashbuckle path contract.
pub fn swagger_routes() -> Router<AppState> {
    Router::new()
        .route("/swagger", get(swagger_ui))
        .route("/swagger/", get(swagger_ui))
        .route("/swagger/index.html", get(swagger_ui))
        .route("/swagger/v1/swagger.json", get(openapi_json))
}
