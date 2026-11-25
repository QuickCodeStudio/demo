use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post, put, delete};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use crate::services::product_category_service::ProductCategoryService;
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
    match ProductCategoryService::list(&state.pool, q.page, q.size).await {
        Ok(rows) => {
            let items = crate::db::rows_to_api(rows);
            let total_count = if q.include_count {
                match ProductCategoryService::count(&state.pool).await {
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
    match ProductCategoryService::count(&state.pool).await {
        Ok(rows) => (StatusCode::OK, Json(json!(crate::db::scalar_number(&rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_item(State(state): State<AppState>, Path((product_id, category_id)): Path<(String, String)>) -> impl IntoResponse {
    match ProductCategoryService::get_item(&state.pool, json!(product_id), json!(category_id)).await {
        Ok(Some(row)) => (StatusCode::OK, Json(crate::db::row_to_api(row))).into_response(),
        Ok(None) => problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn insert(State(state): State<AppState>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match ProductCategoryService::insert(&state.pool, body).await {
        Ok(rows) => (
            StatusCode::CREATED,
            Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null)),
        ).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn update(State(state): State<AppState>, Path((product_id, category_id)): Path<(String, String)>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match ProductCategoryService::get_item(&state.pool, json!(product_id), json!(category_id)).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match ProductCategoryService::update(&state.pool, json!(product_id), json!(category_id), body).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn delete_item(State(state): State<AppState>, Path((product_id, category_id)): Path<(String, String)>) -> impl IntoResponse {
    match ProductCategoryService::get_item(&state.pool, json!(product_id), json!(category_id)).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match ProductCategoryService::delete(&state.pool, json!(product_id), json!(category_id)).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_by_product_id(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("productCategoryProductId").or_else(|| q.get("product_category_product_id")).cloned().unwrap_or_default()));
    match ProductCategoryService::get_by_product_id(&state.pool, values).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_by_category_id(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("productCategoryCategoryId").or_else(|| q.get("product_category_category_id")).cloned().unwrap_or_default()));
    let page: i64 = q.get("pageNumber").or_else(|| q.get("page")).and_then(|s| s.parse().ok()).unwrap_or(1);
    let size: i64 = q.get("pageSize").or_else(|| q.get("page_size")).and_then(|s| s.parse().ok()).unwrap_or(20);
    values.push(json!(((page.max(1) - 1) * size.max(1)).max(0)));
    values.push(json!(size.max(1)));
    match ProductCategoryService::get_by_category_id(&state.pool, values).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn remove_from_category(State(state): State<AppState>, Path((productCategoryProductId, productCategoryCategoryId)): Path<(String, String)>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(productCategoryProductId));
    values.push(json!(productCategoryCategoryId));
    match ProductCategoryService::remove_from_category(&state.pool, values).await {
        Ok(rows) => {
            let n = crate::db::scalar_number(&rows);
            (StatusCode::OK, Json(json!(if n == 0 { 1 } else { n }))).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

pub fn product_category_routes() -> Router<AppState> {
    Router::new()
        .route("/api/product-catalog-module/product-categories/count", get(count))
        .route("/api/product-catalog-module/product-categories", get(list).post(insert))
        .route("/api/product-catalog-module/product-categories/get-by-product-id", get(get_by_product_id))
        .route("/api/product-catalog-module/product-categories/get-by-category-id", get(get_by_category_id))
        .route("/api/product-catalog-module/product-categories/remove-from-category/{productCategoryProductId}/{productCategoryCategoryId}", delete(remove_from_category))
        .route("/api/product-catalog-module/product-categories/{productId}/{categoryId}", get(get_item).put(update).delete(delete_item))
}
