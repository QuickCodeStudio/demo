use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post, put, delete};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use crate::services::product_variant_attribute_service::ProductVariantAttributeService;
use crate::platform::{problem_json, AppState};

#[derive(Debug, Deserialize)]
pub struct PageQuery {
    #[serde(default = "default_page")]
    pub page: i64,
    /// Portal/NSwag send <c>size</c>; Nest also accepts <c>pageSize</c>.
    #[serde(default = "default_size", alias = "pageSize")]
    pub size: i64,
    #[serde(default, rename = "includeCount")]
    pub include_count: bool,
}

fn default_page() -> i64 { 1 }
fn default_size() -> i64 { 20 }

async fn list(State(state): State<AppState>, Query(q): Query<PageQuery>) -> impl IntoResponse {
    match ProductVariantAttributeService::list(&state.pool, q.page, q.size).await {
        Ok(rows) => {
            let items = crate::db::rows_to_api(rows);
            let total_count = if q.include_count {
                match ProductVariantAttributeService::count(&state.pool).await {
                    Ok(count_rows) => Value::from(crate::db::scalar_number(&count_rows)),
                    Err(_) => Value::Null,
                }
            } else {
                Value::Null
            };
            (StatusCode::OK, Json(json!({ "items": items, "totalCount": total_count }))).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "items": [], "totalCount": Value::Null, "error": e.to_string() }))).into_response(),
    }
}

async fn count(State(state): State<AppState>) -> impl IntoResponse {
    match ProductVariantAttributeService::count(&state.pool).await {
        Ok(rows) => (StatusCode::OK, Json(json!(crate::db::scalar_number(&rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_item(State(state): State<AppState>, Path((variant_id, attribute_value_id)): Path<(String, String)>) -> impl IntoResponse {
    match ProductVariantAttributeService::get_item(&state.pool, json!(variant_id), json!(attribute_value_id)).await {
        Ok(Some(row)) => (StatusCode::OK, Json(crate::db::row_to_api(row))).into_response(),
        Ok(None) => problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn insert(State(state): State<AppState>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match ProductVariantAttributeService::insert(&state.pool, body).await {
        Ok(rows) => (
            StatusCode::CREATED,
            Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null)),
        ).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn update(State(state): State<AppState>, Path((variant_id, attribute_value_id)): Path<(String, String)>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match ProductVariantAttributeService::get_item(&state.pool, json!(variant_id), json!(attribute_value_id)).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match ProductVariantAttributeService::update(&state.pool, json!(variant_id), json!(attribute_value_id), body).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn delete_item(State(state): State<AppState>, Path((variant_id, attribute_value_id)): Path<(String, String)>) -> impl IntoResponse {
    match ProductVariantAttributeService::get_item(&state.pool, json!(variant_id), json!(attribute_value_id)).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match ProductVariantAttributeService::delete(&state.pool, json!(variant_id), json!(attribute_value_id)).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_by_variant_id(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("productVariantAttributeVariantId").or_else(|| q.get("product_variant_attribute_variant_id")).cloned().unwrap_or_default()));
    match ProductVariantAttributeService::get_by_variant_id(&state.pool, values).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn remove_attribute(State(state): State<AppState>, Path((productVariantAttributeVariantId, productVariantAttributeAttributeValueId)): Path<(String, String)>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(productVariantAttributeVariantId));
    values.push(json!(productVariantAttributeAttributeValueId));
    match ProductVariantAttributeService::remove_attribute(&state.pool, values).await {
        Ok(rows) => {
            let n = crate::db::scalar_number(&rows);
            (StatusCode::OK, Json(json!(if n == 0 { 1 } else { n }))).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

pub fn product_variant_attribute_routes() -> Router<AppState> {
    Router::new()
        .route("/api/product-catalog-module/product-variant-attributes/count", get(count))
        .route("/api/product-catalog-module/product-variant-attributes", get(list).post(insert))
        .route("/api/product-catalog-module/product-variant-attributes/get-by-variant-id", get(get_by_variant_id))
        .route("/api/product-catalog-module/product-variant-attributes/remove-attribute/{productVariantAttributeVariantId}/{productVariantAttributeAttributeValueId}", delete(remove_attribute))
        .route("/api/product-catalog-module/product-variant-attributes/{variantId}/{attributeValueId}", get(get_item).put(update).delete(delete_item))
}
