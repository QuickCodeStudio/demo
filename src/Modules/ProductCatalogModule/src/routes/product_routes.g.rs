use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post, put, delete};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use crate::services::product_service::ProductService;
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
    match ProductService::list(&state.pool, q.page, q.size).await {
        Ok(rows) => {
            let items = crate::db::rows_to_api(rows);
            let total_count = if q.include_count {
                match ProductService::count(&state.pool).await {
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
    match ProductService::count(&state.pool).await {
        Ok(rows) => (StatusCode::OK, Json(json!(crate::db::scalar_number(&rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_item(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match ProductService::get_item(&state.pool, json!(id)).await {
        Ok(Some(row)) => (StatusCode::OK, Json(crate::db::row_to_api(row))).into_response(),
        Ok(None) => problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn insert(State(state): State<AppState>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match ProductService::insert(&state.pool, body).await {
        Ok(rows) => (
            StatusCode::CREATED,
            Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null)),
        ).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn update(State(state): State<AppState>, Path(id): Path<String>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match ProductService::get_item(&state.pool, json!(id)).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match ProductService::update(&state.pool, json!(id), body).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn delete_item(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match ProductService::get_item(&state.pool, json!(id)).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match ProductService::delete(&state.pool, json!(id)).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_by_sku(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("productSku").or_else(|| q.get("product_sku")).cloned().unwrap_or_default()));
    match ProductService::get_by_sku(&state.pool, values).await {
        Ok(rows) => (StatusCode::OK, Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_active_by_seller(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("productSellerId").or_else(|| q.get("product_seller_id")).cloned().unwrap_or_default()));
    let page: i64 = q.get("pageNumber").or_else(|| q.get("page")).and_then(|s| s.parse().ok()).unwrap_or(1);
    let size: i64 = q.get("pageSize").or_else(|| q.get("page_size")).and_then(|s| s.parse().ok()).unwrap_or(20);
    values.push(json!(((page.max(1) - 1) * size.max(1)).max(0)));
    values.push(json!(size.max(1)));
    match ProductService::get_active_by_seller(&state.pool, values).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn search_products(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("productName").or_else(|| q.get("product_name")).cloned().unwrap_or_default()));
    let page: i64 = q.get("pageNumber").or_else(|| q.get("page")).and_then(|s| s.parse().ok()).unwrap_or(1);
    let size: i64 = q.get("pageSize").or_else(|| q.get("page_size")).and_then(|s| s.parse().ok()).unwrap_or(20);
    values.push(json!(((page.max(1) - 1) * size.max(1)).max(0)));
    values.push(json!(size.max(1)));
    match ProductService::search_products(&state.pool, values).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_pending_approval(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    let page: i64 = q.get("pageNumber").or_else(|| q.get("page")).and_then(|s| s.parse().ok()).unwrap_or(1);
    let size: i64 = q.get("pageSize").or_else(|| q.get("page_size")).and_then(|s| s.parse().ok()).unwrap_or(20);
    values.push(json!(((page.max(1) - 1) * size.max(1)).max(0)));
    values.push(json!(size.max(1)));
    match ProductService::get_pending_approval(&state.pool, values).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_featured(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    let page: i64 = q.get("pageNumber").or_else(|| q.get("page")).and_then(|s| s.parse().ok()).unwrap_or(1);
    let size: i64 = q.get("pageSize").or_else(|| q.get("page_size")).and_then(|s| s.parse().ok()).unwrap_or(20);
    values.push(json!(((page.max(1) - 1) * size.max(1)).max(0)));
    values.push(json!(size.max(1)));
    match ProductService::get_featured(&state.pool, values).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_products_with_details(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("productsPrimaryCategoryId").or_else(|| q.get("products_primary_category_id")).cloned().unwrap_or_default()));
    values.push(json!(q.get("categoryId").or_else(|| q.get("category_id")).cloned().unwrap_or_default()));
    values.push(json!(q.get("productBrandId").or_else(|| q.get("product_brand_id")).cloned().unwrap_or_default()));
    values.push(json!(q.get("brandId").or_else(|| q.get("brand_id")).cloned().unwrap_or_default()));
    let page: i64 = q.get("pageNumber").or_else(|| q.get("page")).and_then(|s| s.parse().ok()).unwrap_or(1);
    let size: i64 = q.get("pageSize").or_else(|| q.get("page_size")).and_then(|s| s.parse().ok()).unwrap_or(20);
    values.push(json!(((page.max(1) - 1) * size.max(1)).max(0)));
    values.push(json!(size.max(1)));
    match ProductService::get_products_with_details(&state.pool, values).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_count_by_status(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("productStatus").or_else(|| q.get("product_status")).cloned().unwrap_or_default()));
    match ProductService::get_count_by_status(&state.pool, values).await {
        Ok(rows) => (StatusCode::OK, Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn approve(State(state): State<AppState>, Path(productId): Path<String>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(productId));

    match ProductService::approve(&state.pool, values).await {
        Ok(rows) => {
            let n = crate::db::scalar_number(&rows);
            (StatusCode::OK, Json(json!(if n == 0 { 1 } else { n }))).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn reject(State(state): State<AppState>, Path(productId): Path<String>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(productId));

    match ProductService::reject(&state.pool, values).await {
        Ok(rows) => {
            let n = crate::db::scalar_number(&rows);
            (StatusCode::OK, Json(json!(if n == 0 { 1 } else { n }))).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn set_featured(State(state): State<AppState>, Path(productId): Path<String>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(productId));

    values.push(body.get("productIsFeatured").cloned().or_else(|| body.get("ProductIsFeatured").cloned()).or_else(|| body.get("product_is_featured").cloned()).unwrap_or(Value::Null));
    match ProductService::set_featured(&state.pool, values).await {
        Ok(rows) => {
            let n = crate::db::scalar_number(&rows);
            (StatusCode::OK, Json(json!(if n == 0 { 1 } else { n }))).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

pub fn product_routes() -> Router<AppState> {
    Router::new()
        .route("/api/product-catalog-module/products/count", get(count))
        .route("/api/product-catalog-module/products", get(list).post(insert))
        .route("/api/product-catalog-module/products/get-by-sku", get(get_by_sku))
        .route("/api/product-catalog-module/products/get-active-by-seller", get(get_active_by_seller))
        .route("/api/product-catalog-module/products/search-products", get(search_products))
        .route("/api/product-catalog-module/products/get-pending-approval", get(get_pending_approval))
        .route("/api/product-catalog-module/products/get-featured", get(get_featured))
        .route("/api/product-catalog-module/products/get-products-with-details", get(get_products_with_details))
        .route("/api/product-catalog-module/products/get-count-by-status", get(get_count_by_status))
        .route("/api/product-catalog-module/products/approve/{productId}", axum::routing::patch(approve))
        .route("/api/product-catalog-module/products/reject/{productId}", axum::routing::patch(reject))
        .route("/api/product-catalog-module/products/set-featured/{productId}", axum::routing::patch(set_featured))
        .route("/api/product-catalog-module/products/{id}", get(get_item).put(update).delete(delete_item))
}
