use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post, put, delete};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use crate::cqrs::send;
use crate::features::queries::attribute_definition::list_attribute_definition_query::{ListAttributeDefinitionQuery, ListAttributeDefinitionHandler};
use crate::features::queries::attribute_definition::get_item_attribute_definition_query::{GetItemAttributeDefinitionQuery, GetItemAttributeDefinitionHandler};
use crate::features::queries::attribute_definition::total_item_count_attribute_definition_query::{TotalItemCountAttributeDefinitionQuery, TotalItemCountAttributeDefinitionHandler};
use crate::features::commands::attribute_definition::insert_attribute_definition_command::{InsertAttributeDefinitionCommand, InsertAttributeDefinitionHandler};
use crate::features::commands::attribute_definition::update_attribute_definition_command::{UpdateAttributeDefinitionCommand, UpdateAttributeDefinitionHandler};
use crate::features::commands::attribute_definition::delete_item_attribute_definition_command::{DeleteItemAttributeDefinitionCommand, DeleteItemAttributeDefinitionHandler};
use crate::features::queries::attribute_definition::get_by_code_attribute_definition_query::{GetByCodeAttributeDefinitionQuery, GetByCodeAttributeDefinitionHandler};
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
    match send::<ListAttributeDefinitionHandler, _>(&state.pool, ListAttributeDefinitionQuery {
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
    match send::<TotalItemCountAttributeDefinitionHandler, _>(&state.pool, TotalItemCountAttributeDefinitionQuery).await {
        Ok(n) => (StatusCode::OK, Json(json!(n))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_item(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match send::<GetItemAttributeDefinitionHandler, _>(&state.pool, GetItemAttributeDefinitionQuery { id: json!(id) }).await {
        Ok(Some(row)) => (StatusCode::OK, Json(crate::db::row_to_api(row))).into_response(),
        Ok(None) => problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn insert(State(state): State<AppState>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match send::<InsertAttributeDefinitionHandler, _>(&state.pool, InsertAttributeDefinitionCommand { body }).await {
        Ok(rows) => (
            StatusCode::CREATED,
            Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null)),
        ).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn update(State(state): State<AppState>, Path(id): Path<String>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match send::<GetItemAttributeDefinitionHandler, _>(&state.pool, GetItemAttributeDefinitionQuery { id: json!(id) }).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match send::<UpdateAttributeDefinitionHandler, _>(&state.pool, UpdateAttributeDefinitionCommand { id: json!(id), body }).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn delete_item(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match send::<GetItemAttributeDefinitionHandler, _>(&state.pool, GetItemAttributeDefinitionQuery { id: json!(id) }).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match send::<DeleteItemAttributeDefinitionHandler, _>(&state.pool, DeleteItemAttributeDefinitionCommand { id: json!(id) }).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_by_code(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("attributeDefinitionCode").or_else(|| q.get("attribute_definition_code")).cloned().unwrap_or_default()));
    match send::<GetByCodeAttributeDefinitionHandler, _>(&state.pool, GetByCodeAttributeDefinitionQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

pub fn attribute_definition_routes() -> Router<AppState> {
    Router::new()
        .route("/api/product-catalog-module/attribute-definitions/count", get(count))
        .route("/api/product-catalog-module/attribute-definitions", get(list).post(insert))
        .route("/api/product-catalog-module/attribute-definitions/get-by-code", get(get_by_code))
        .route("/api/product-catalog-module/attribute-definitions/{id}", get(get_item).put(update).delete(delete_item))
}
