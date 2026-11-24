use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post, put, delete};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use crate::cqrs::send;
use crate::features::queries::product_category::list_product_category_query::{ListProductCategoryQuery, ListProductCategoryHandler};
use crate::features::queries::product_category::get_item_product_category_query::{GetItemProductCategoryQuery, GetItemProductCategoryHandler};
use crate::features::queries::product_category::total_item_count_product_category_query::{TotalItemCountProductCategoryQuery, TotalItemCountProductCategoryHandler};
use crate::features::commands::product_category::insert_product_category_command::{InsertProductCategoryCommand, InsertProductCategoryHandler};
use crate::features::commands::product_category::update_product_category_command::{UpdateProductCategoryCommand, UpdateProductCategoryHandler};
use crate::features::commands::product_category::delete_item_product_category_command::{DeleteItemProductCategoryCommand, DeleteItemProductCategoryHandler};
use crate::features::queries::product_category::get_by_product_id_product_category_query::{GetByProductIdProductCategoryQuery, GetByProductIdProductCategoryHandler};
use crate::features::queries::product_category::get_by_category_id_product_category_query::{GetByCategoryIdProductCategoryQuery, GetByCategoryIdProductCategoryHandler};
use crate::features::commands::product_category::remove_from_category_product_category_command::{RemoveFromCategoryProductCategoryCommand, RemoveFromCategoryProductCategoryHandler};
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
    match send::<ListProductCategoryHandler, _>(&state.pool, ListProductCategoryQuery {
        page: q.page,
        size: q.size,
        include_count: q.include_count,
    }).await {
        Ok(result) => {
            let items = crate::db::rows_to_api(result.items);
            let total_count = match result.total_count {
                Some(n) => Value::from(n),
                None => Value::Null,
            };
            (StatusCode::OK, Json(json!({ "items": items, "totalCount": total_count }))).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "items": [], "totalCount": Value::Null, "error": e.to_string() }))).into_response(),
    }
}

async fn count(State(state): State<AppState>) -> impl IntoResponse {
    match send::<TotalItemCountProductCategoryHandler, _>(&state.pool, TotalItemCountProductCategoryQuery).await {
        Ok(n) => (StatusCode::OK, Json(json!(n))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_item(State(state): State<AppState>, Path((product_id, category_id)): Path<(String, String)>) -> impl IntoResponse {
    match send::<GetItemProductCategoryHandler, _>(&state.pool, GetItemProductCategoryQuery { product_id: json!(product_id), category_id: json!(category_id) }).await {
        Ok(Some(row)) => (StatusCode::OK, Json(crate::db::row_to_api(row))).into_response(),
        Ok(None) => problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn insert(State(state): State<AppState>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match send::<InsertProductCategoryHandler, _>(&state.pool, InsertProductCategoryCommand { body }).await {
        Ok(rows) => (
            StatusCode::CREATED,
            Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null)),
        ).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn update(State(state): State<AppState>, Path((product_id, category_id)): Path<(String, String)>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match send::<GetItemProductCategoryHandler, _>(&state.pool, GetItemProductCategoryQuery { product_id: json!(product_id), category_id: json!(category_id) }).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match send::<UpdateProductCategoryHandler, _>(&state.pool, UpdateProductCategoryCommand { product_id: json!(product_id), category_id: json!(category_id), body }).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn delete_item(State(state): State<AppState>, Path((product_id, category_id)): Path<(String, String)>) -> impl IntoResponse {
    match send::<GetItemProductCategoryHandler, _>(&state.pool, GetItemProductCategoryQuery { product_id: json!(product_id), category_id: json!(category_id) }).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match send::<DeleteItemProductCategoryHandler, _>(&state.pool, DeleteItemProductCategoryCommand { product_id: json!(product_id), category_id: json!(category_id) }).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_by_product_id(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("productCategoryProductId").or_else(|| q.get("product_category_product_id")).cloned().unwrap_or_default()));
    match send::<GetByProductIdProductCategoryHandler, _>(&state.pool, GetByProductIdProductCategoryQuery { values }).await {
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
    match send::<GetByCategoryIdProductCategoryHandler, _>(&state.pool, GetByCategoryIdProductCategoryQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn remove_from_category(State(state): State<AppState>, Path((productCategoryProductId, productCategoryCategoryId)): Path<(String, String)>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(productCategoryProductId));
    values.push(json!(productCategoryCategoryId));
    match send::<RemoveFromCategoryProductCategoryHandler, _>(&state.pool, RemoveFromCategoryProductCategoryCommand { values }).await {
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
