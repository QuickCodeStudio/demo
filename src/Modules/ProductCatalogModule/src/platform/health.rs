use axum::Json;
use axum::routing::get;
use axum::Router;
use serde_json::{json, Value};
use crate::platform::AppState;

/// C# / Nest QuickCode `/hc` JSON shape (not Actuator-style).
async fn health() -> Json<Value> {
    Json(json!({
        "status": "Healthy",
        "totalDuration": "00:00:00.001",
        "entries": {
            "self": { "status": "Healthy" }
        }
    }))
}

pub fn health_routes() -> Router<AppState> {
    Router::new().route("/hc", get(health))
}
