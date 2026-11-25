use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post, put, delete};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use crate::services::product_variant_service::ProductVariantService;
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
    match ProductVariantService::list(&state.pool, q.page, q.size).await {
        Ok(rows) => {
            let items = crate::db::rows_to_api(rows);
            let total_count = if q.include_count {
                match ProductVariantService::count(&state.pool).await {
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
    match ProductVariantService::count(&state.pool).await {
        Ok(rows) => (StatusCode::OK, Json(json!(crate::db::scalar_number(&rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_item(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match ProductVariantService::get_item(&state.pool, json!(id)).await {
        Ok(Some(row)) => (StatusCode::OK, Json(crate::db::row_to_api(row))).into_response(),
        Ok(None) => problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn insert(State(state): State<AppState>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match ProductVariantService::insert(&state.pool, body).await {
        Ok(rows) => (
            StatusCode::CREATED,
            Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null)),
        ).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn update(State(state): State<AppState>, Path(id): Path<String>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match ProductVariantService::get_item(&state.pool, json!(id)).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match ProductVariantService::update(&state.pool, json!(id), body).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn delete_item(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match ProductVariantService::get_item(&state.pool, json!(id)).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match ProductVariantService::delete(&state.pool, json!(id)).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_by_product_id(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("productVariantProductId").or_else(|| q.get("product_variant_product_id")).cloned().unwrap_or_default()));
    let page: i64 = q.get("pageNumber").or_else(|| q.get("page")).and_then(|s| s.parse().ok()).unwrap_or(1);
    let size: i64 = q.get("pageSize").or_else(|| q.get("page_size")).and_then(|s| s.parse().ok()).unwrap_or(20);
    values.push(json!(((page.max(1) - 1) * size.max(1)).max(0)));
    values.push(json!(size.max(1)));
    match ProductVariantService::get_by_product_id(&state.pool, values).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_active_by_product_id(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("productVariantProductId").or_else(|| q.get("product_variant_product_id")).cloned().unwrap_or_default()));
    let page: i64 = q.get("pageNumber").or_else(|| q.get("page")).and_then(|s| s.parse().ok()).unwrap_or(1);
    let size: i64 = q.get("pageSize").or_else(|| q.get("page_size")).and_then(|s| s.parse().ok()).unwrap_or(20);
    values.push(json!(((page.max(1) - 1) * size.max(1)).max(0)));
    values.push(json!(size.max(1)));
    match ProductVariantService::get_active_by_product_id(&state.pool, values).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_low_stock_variants(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    let page: i64 = q.get("pageNumber").or_else(|| q.get("page")).and_then(|s| s.parse().ok()).unwrap_or(1);
    let size: i64 = q.get("pageSize").or_else(|| q.get("page_size")).and_then(|s| s.parse().ok()).unwrap_or(20);
    values.push(json!(((page.max(1) - 1) * size.max(1)).max(0)));
    values.push(json!(size.max(1)));
    match ProductVariantService::get_low_stock_variants(&state.pool, values).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn update_stock(State(state): State<AppState>, Path(productVariantId): Path<String>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(productVariantId));

    values.push(body.get("productVariantStockQuantity").cloned().or_else(|| body.get("ProductVariantStockQuantity").cloned()).or_else(|| body.get("product_variant_stock_quantity").cloned()).unwrap_or(Value::Null));
    match ProductVariantService::update_stock(&state.pool, values).await {
        Ok(rows) => {
            let n = crate::db::scalar_number(&rows);
            (StatusCode::OK, Json(json!(if n == 0 { 1 } else { n }))).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn update_price(State(state): State<AppState>, Path(productVariantId): Path<String>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(productVariantId));

    values.push(body.get("productVariantPrice").cloned().or_else(|| body.get("ProductVariantPrice").cloned()).or_else(|| body.get("product_variant_price").cloned()).unwrap_or(Value::Null));
    match ProductVariantService::update_price(&state.pool, values).await {
        Ok(rows) => {
            let n = crate::db::scalar_number(&rows);
            (StatusCode::OK, Json(json!(if n == 0 { 1 } else { n }))).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn deactivate(State(state): State<AppState>, Path(productVariantId): Path<String>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(productVariantId));

    match ProductVariantService::deactivate(&state.pool, values).await {
        Ok(rows) => {
            let n = crate::db::scalar_number(&rows);
            (StatusCode::OK, Json(json!(if n == 0 { 1 } else { n }))).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

pub fn product_variant_routes() -> Router<AppState> {
    Router::new()
        .route("/api/product-catalog-module/product-variants/count", get(count))
        .route("/api/product-catalog-module/product-variants", get(list).post(insert))
        .route("/api/product-catalog-module/product-variants/get-by-product-id", get(get_by_product_id))
        .route("/api/product-catalog-module/product-variants/get-active-by-product-id", get(get_active_by_product_id))
        .route("/api/product-catalog-module/product-variants/get-low-stock-variants", get(get_low_stock_variants))
        .route("/api/product-catalog-module/product-variants/update-stock/{productVariantId}", axum::routing::patch(update_stock))
        .route("/api/product-catalog-module/product-variants/update-price/{productVariantId}", axum::routing::patch(update_price))
        .route("/api/product-catalog-module/product-variants/deactivate/{productVariantId}", axum::routing::patch(deactivate))
        .route("/api/product-catalog-module/product-variants/{id}", get(get_item).put(update).delete(delete_item))
}
