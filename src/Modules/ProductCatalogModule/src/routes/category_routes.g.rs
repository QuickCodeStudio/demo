use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post, put, delete};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use crate::cqrs::send;
use crate::features::queries::category::list_category_query::{ListCategoryQuery, ListCategoryHandler};
use crate::features::queries::category::get_item_category_query::{GetItemCategoryQuery, GetItemCategoryHandler};
use crate::features::queries::category::total_item_count_category_query::{TotalItemCountCategoryQuery, TotalItemCountCategoryHandler};
use crate::features::commands::category::insert_category_command::{InsertCategoryCommand, InsertCategoryHandler};
use crate::features::commands::category::update_category_command::{UpdateCategoryCommand, UpdateCategoryHandler};
use crate::features::commands::category::delete_item_category_command::{DeleteItemCategoryCommand, DeleteItemCategoryHandler};
use crate::features::queries::category::get_active_category_query::{GetActiveCategoryQuery, GetActiveCategoryHandler};
use crate::features::queries::category::get_sub_categories_category_query::{GetSubCategoriesCategoryQuery, GetSubCategoriesCategoryHandler};
use crate::features::queries::category::get_by_slug_category_query::{GetBySlugCategoryQuery, GetBySlugCategoryHandler};
use crate::features::commands::category::deactivate_category_command::{DeactivateCategoryCommand, DeactivateCategoryHandler};
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
    match send::<ListCategoryHandler, _>(&state.pool, ListCategoryQuery {
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
    match send::<TotalItemCountCategoryHandler, _>(&state.pool, TotalItemCountCategoryQuery).await {
        Ok(n) => (StatusCode::OK, Json(json!(n))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_item(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match send::<GetItemCategoryHandler, _>(&state.pool, GetItemCategoryQuery { id: json!(id) }).await {
        Ok(Some(row)) => (StatusCode::OK, Json(crate::db::row_to_api(row))).into_response(),
        Ok(None) => problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn insert(State(state): State<AppState>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match send::<InsertCategoryHandler, _>(&state.pool, InsertCategoryCommand { body }).await {
        Ok(rows) => (
            StatusCode::CREATED,
            Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null)),
        ).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn update(State(state): State<AppState>, Path(id): Path<String>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match send::<GetItemCategoryHandler, _>(&state.pool, GetItemCategoryQuery { id: json!(id) }).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match send::<UpdateCategoryHandler, _>(&state.pool, UpdateCategoryCommand { id: json!(id), body }).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn delete_item(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match send::<GetItemCategoryHandler, _>(&state.pool, GetItemCategoryQuery { id: json!(id) }).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match send::<DeleteItemCategoryHandler, _>(&state.pool, DeleteItemCategoryCommand { id: json!(id) }).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_active(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    let page: i64 = q.get("pageNumber").or_else(|| q.get("page")).and_then(|s| s.parse().ok()).unwrap_or(1);
    let size: i64 = q.get("pageSize").or_else(|| q.get("page_size")).and_then(|s| s.parse().ok()).unwrap_or(20);
    values.push(json!(((page.max(1) - 1) * size.max(1)).max(0)));
    values.push(json!(size.max(1)));
    match send::<GetActiveCategoryHandler, _>(&state.pool, GetActiveCategoryQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_sub_categories(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("categoryParentCategoryId").or_else(|| q.get("category_parent_category_id")).cloned().unwrap_or_default()));
    let page: i64 = q.get("pageNumber").or_else(|| q.get("page")).and_then(|s| s.parse().ok()).unwrap_or(1);
    let size: i64 = q.get("pageSize").or_else(|| q.get("page_size")).and_then(|s| s.parse().ok()).unwrap_or(20);
    values.push(json!(((page.max(1) - 1) * size.max(1)).max(0)));
    values.push(json!(size.max(1)));
    match send::<GetSubCategoriesCategoryHandler, _>(&state.pool, GetSubCategoriesCategoryQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_by_slug(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("categorySlug").or_else(|| q.get("category_slug")).cloned().unwrap_or_default()));
    match send::<GetBySlugCategoryHandler, _>(&state.pool, GetBySlugCategoryQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn deactivate(State(state): State<AppState>, Path(categoryId): Path<String>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(categoryId));

    match send::<DeactivateCategoryHandler, _>(&state.pool, DeactivateCategoryCommand { values }).await {
        Ok(rows) => {
            let n = crate::db::scalar_number(&rows);
            (StatusCode::OK, Json(json!(if n == 0 { 1 } else { n }))).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

pub fn category_routes() -> Router<AppState> {
    Router::new()
        .route("/api/product-catalog-module/categories/count", get(count))
        .route("/api/product-catalog-module/categories", get(list).post(insert))
        .route("/api/product-catalog-module/categories/get-active", get(get_active))
        .route("/api/product-catalog-module/categories/get-sub-categories", get(get_sub_categories))
        .route("/api/product-catalog-module/categories/get-by-slug", get(get_by_slug))
        .route("/api/product-catalog-module/categories/deactivate/{categoryId}", axum::routing::patch(deactivate))
        .route("/api/product-catalog-module/categories/{id}", get(get_item).put(update).delete(delete_item))
}
