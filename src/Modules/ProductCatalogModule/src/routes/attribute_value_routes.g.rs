use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post, put, delete};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use crate::cqrs::send;
use crate::features::queries::attribute_value::list_attribute_value_query::{ListAttributeValueQuery, ListAttributeValueHandler};
use crate::features::queries::attribute_value::get_item_attribute_value_query::{GetItemAttributeValueQuery, GetItemAttributeValueHandler};
use crate::features::queries::attribute_value::total_item_count_attribute_value_query::{TotalItemCountAttributeValueQuery, TotalItemCountAttributeValueHandler};
use crate::features::commands::attribute_value::insert_attribute_value_command::{InsertAttributeValueCommand, InsertAttributeValueHandler};
use crate::features::commands::attribute_value::update_attribute_value_command::{UpdateAttributeValueCommand, UpdateAttributeValueHandler};
use crate::features::commands::attribute_value::delete_item_attribute_value_command::{DeleteItemAttributeValueCommand, DeleteItemAttributeValueHandler};
use crate::features::queries::attribute_value::get_by_attribute_id_attribute_value_query::{GetByAttributeIdAttributeValueQuery, GetByAttributeIdAttributeValueHandler};
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
    match send::<ListAttributeValueHandler, _>(&state.pool, ListAttributeValueQuery {
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
    match send::<TotalItemCountAttributeValueHandler, _>(&state.pool, TotalItemCountAttributeValueQuery).await {
        Ok(n) => (StatusCode::OK, Json(json!(n))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_item(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match send::<GetItemAttributeValueHandler, _>(&state.pool, GetItemAttributeValueQuery { id: json!(id) }).await {
        Ok(Some(row)) => (StatusCode::OK, Json(crate::db::row_to_api(row))).into_response(),
        Ok(None) => problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn insert(State(state): State<AppState>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match send::<InsertAttributeValueHandler, _>(&state.pool, InsertAttributeValueCommand { body }).await {
        Ok(rows) => (
            StatusCode::CREATED,
            Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null)),
        ).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn update(State(state): State<AppState>, Path(id): Path<String>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match send::<GetItemAttributeValueHandler, _>(&state.pool, GetItemAttributeValueQuery { id: json!(id) }).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match send::<UpdateAttributeValueHandler, _>(&state.pool, UpdateAttributeValueCommand { id: json!(id), body }).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn delete_item(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match send::<GetItemAttributeValueHandler, _>(&state.pool, GetItemAttributeValueQuery { id: json!(id) }).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match send::<DeleteItemAttributeValueHandler, _>(&state.pool, DeleteItemAttributeValueCommand { id: json!(id) }).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_by_attribute_id(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("attributeValueAttributeId").or_else(|| q.get("attribute_value_attribute_id")).cloned().unwrap_or_default()));
    let page: i64 = q.get("pageNumber").or_else(|| q.get("page")).and_then(|s| s.parse().ok()).unwrap_or(1);
    let size: i64 = q.get("pageSize").or_else(|| q.get("page_size")).and_then(|s| s.parse().ok()).unwrap_or(20);
    values.push(json!(((page.max(1) - 1) * size.max(1)).max(0)));
    values.push(json!(size.max(1)));
    match send::<GetByAttributeIdAttributeValueHandler, _>(&state.pool, GetByAttributeIdAttributeValueQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

pub fn attribute_value_routes() -> Router<AppState> {
    Router::new()
        .route("/api/product-catalog-module/attribute-values/count", get(count))
        .route("/api/product-catalog-module/attribute-values", get(list).post(insert))
        .route("/api/product-catalog-module/attribute-values/get-by-attribute-id", get(get_by_attribute_id))
        .route("/api/product-catalog-module/attribute-values/{id}", get(get_item).put(update).delete(delete_item))
}
