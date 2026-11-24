use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post, put, delete};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use crate::cqrs::send;
use crate::features::queries::product_variant_attribute::list_product_variant_attribute_query::{ListProductVariantAttributeQuery, ListProductVariantAttributeHandler};
use crate::features::queries::product_variant_attribute::get_item_product_variant_attribute_query::{GetItemProductVariantAttributeQuery, GetItemProductVariantAttributeHandler};
use crate::features::queries::product_variant_attribute::total_item_count_product_variant_attribute_query::{TotalItemCountProductVariantAttributeQuery, TotalItemCountProductVariantAttributeHandler};
use crate::features::commands::product_variant_attribute::insert_product_variant_attribute_command::{InsertProductVariantAttributeCommand, InsertProductVariantAttributeHandler};
use crate::features::commands::product_variant_attribute::update_product_variant_attribute_command::{UpdateProductVariantAttributeCommand, UpdateProductVariantAttributeHandler};
use crate::features::commands::product_variant_attribute::delete_item_product_variant_attribute_command::{DeleteItemProductVariantAttributeCommand, DeleteItemProductVariantAttributeHandler};
use crate::features::queries::product_variant_attribute::get_by_variant_id_product_variant_attribute_query::{GetByVariantIdProductVariantAttributeQuery, GetByVariantIdProductVariantAttributeHandler};
use crate::features::commands::product_variant_attribute::remove_attribute_product_variant_attribute_command::{RemoveAttributeProductVariantAttributeCommand, RemoveAttributeProductVariantAttributeHandler};
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
    match send::<ListProductVariantAttributeHandler, _>(&state.pool, ListProductVariantAttributeQuery {
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
    match send::<TotalItemCountProductVariantAttributeHandler, _>(&state.pool, TotalItemCountProductVariantAttributeQuery).await {
        Ok(n) => (StatusCode::OK, Json(json!(n))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_item(State(state): State<AppState>, Path((variant_id, attribute_value_id)): Path<(String, String)>) -> impl IntoResponse {
    match send::<GetItemProductVariantAttributeHandler, _>(&state.pool, GetItemProductVariantAttributeQuery { variant_id: json!(variant_id), attribute_value_id: json!(attribute_value_id) }).await {
        Ok(Some(row)) => (StatusCode::OK, Json(crate::db::row_to_api(row))).into_response(),
        Ok(None) => problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn insert(State(state): State<AppState>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match send::<InsertProductVariantAttributeHandler, _>(&state.pool, InsertProductVariantAttributeCommand { body }).await {
        Ok(rows) => (
            StatusCode::CREATED,
            Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null)),
        ).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn update(State(state): State<AppState>, Path((variant_id, attribute_value_id)): Path<(String, String)>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match send::<GetItemProductVariantAttributeHandler, _>(&state.pool, GetItemProductVariantAttributeQuery { variant_id: json!(variant_id), attribute_value_id: json!(attribute_value_id) }).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match send::<UpdateProductVariantAttributeHandler, _>(&state.pool, UpdateProductVariantAttributeCommand { variant_id: json!(variant_id), attribute_value_id: json!(attribute_value_id), body }).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn delete_item(State(state): State<AppState>, Path((variant_id, attribute_value_id)): Path<(String, String)>) -> impl IntoResponse {
    match send::<GetItemProductVariantAttributeHandler, _>(&state.pool, GetItemProductVariantAttributeQuery { variant_id: json!(variant_id), attribute_value_id: json!(attribute_value_id) }).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match send::<DeleteItemProductVariantAttributeHandler, _>(&state.pool, DeleteItemProductVariantAttributeCommand { variant_id: json!(variant_id), attribute_value_id: json!(attribute_value_id) }).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_by_variant_id(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("productVariantAttributeVariantId").or_else(|| q.get("product_variant_attribute_variant_id")).cloned().unwrap_or_default()));
    match send::<GetByVariantIdProductVariantAttributeHandler, _>(&state.pool, GetByVariantIdProductVariantAttributeQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn remove_attribute(State(state): State<AppState>, Path((productVariantAttributeVariantId, productVariantAttributeAttributeValueId)): Path<(String, String)>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(productVariantAttributeVariantId));
    values.push(json!(productVariantAttributeAttributeValueId));
    match send::<RemoveAttributeProductVariantAttributeHandler, _>(&state.pool, RemoveAttributeProductVariantAttributeCommand { values }).await {
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
