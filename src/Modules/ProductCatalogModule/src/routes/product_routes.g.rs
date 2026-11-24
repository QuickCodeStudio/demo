use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post, put, delete};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use crate::cqrs::send;
use crate::features::queries::product::list_product_query::{ListProductQuery, ListProductHandler};
use crate::features::queries::product::get_item_product_query::{GetItemProductQuery, GetItemProductHandler};
use crate::features::queries::product::total_item_count_product_query::{TotalItemCountProductQuery, TotalItemCountProductHandler};
use crate::features::commands::product::insert_product_command::{InsertProductCommand, InsertProductHandler};
use crate::features::commands::product::update_product_command::{UpdateProductCommand, UpdateProductHandler};
use crate::features::commands::product::delete_item_product_command::{DeleteItemProductCommand, DeleteItemProductHandler};
use crate::features::queries::product::get_by_sku_product_query::{GetBySkuProductQuery, GetBySkuProductHandler};
use crate::features::queries::product::get_active_by_seller_product_query::{GetActiveBySellerProductQuery, GetActiveBySellerProductHandler};
use crate::features::queries::product::search_products_product_query::{SearchProductsProductQuery, SearchProductsProductHandler};
use crate::features::queries::product::get_pending_approval_product_query::{GetPendingApprovalProductQuery, GetPendingApprovalProductHandler};
use crate::features::queries::product::get_featured_product_query::{GetFeaturedProductQuery, GetFeaturedProductHandler};
use crate::features::queries::product::get_products_with_details_product_query::{GetProductsWithDetailsProductQuery, GetProductsWithDetailsProductHandler};
use crate::features::queries::product::get_count_by_status_product_query::{GetCountByStatusProductQuery, GetCountByStatusProductHandler};
use crate::features::commands::product::approve_product_command::{ApproveProductCommand, ApproveProductHandler};
use crate::features::commands::product::reject_product_command::{RejectProductCommand, RejectProductHandler};
use crate::features::commands::product::set_featured_product_command::{SetFeaturedProductCommand, SetFeaturedProductHandler};
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
    match send::<ListProductHandler, _>(&state.pool, ListProductQuery {
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
    match send::<TotalItemCountProductHandler, _>(&state.pool, TotalItemCountProductQuery).await {
        Ok(n) => (StatusCode::OK, Json(json!(n))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_item(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match send::<GetItemProductHandler, _>(&state.pool, GetItemProductQuery { id: json!(id) }).await {
        Ok(Some(row)) => (StatusCode::OK, Json(crate::db::row_to_api(row))).into_response(),
        Ok(None) => problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn insert(State(state): State<AppState>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match send::<InsertProductHandler, _>(&state.pool, InsertProductCommand { body }).await {
        Ok(rows) => (
            StatusCode::CREATED,
            Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null)),
        ).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn update(State(state): State<AppState>, Path(id): Path<String>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match send::<GetItemProductHandler, _>(&state.pool, GetItemProductQuery { id: json!(id) }).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match send::<UpdateProductHandler, _>(&state.pool, UpdateProductCommand { id: json!(id), body }).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn delete_item(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match send::<GetItemProductHandler, _>(&state.pool, GetItemProductQuery { id: json!(id) }).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match send::<DeleteItemProductHandler, _>(&state.pool, DeleteItemProductCommand { id: json!(id) }).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_by_sku(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("productSku").or_else(|| q.get("product_sku")).cloned().unwrap_or_default()));
    match send::<GetBySkuProductHandler, _>(&state.pool, GetBySkuProductQuery { values }).await {
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
    match send::<GetActiveBySellerProductHandler, _>(&state.pool, GetActiveBySellerProductQuery { values }).await {
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
    match send::<SearchProductsProductHandler, _>(&state.pool, SearchProductsProductQuery { values }).await {
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
    match send::<GetPendingApprovalProductHandler, _>(&state.pool, GetPendingApprovalProductQuery { values }).await {
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
    match send::<GetFeaturedProductHandler, _>(&state.pool, GetFeaturedProductQuery { values }).await {
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
    match send::<GetProductsWithDetailsProductHandler, _>(&state.pool, GetProductsWithDetailsProductQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_count_by_status(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("productStatus").or_else(|| q.get("product_status")).cloned().unwrap_or_default()));
    match send::<GetCountByStatusProductHandler, _>(&state.pool, GetCountByStatusProductQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn approve(State(state): State<AppState>, Path(productId): Path<String>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(productId));

    match send::<ApproveProductHandler, _>(&state.pool, ApproveProductCommand { values }).await {
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

    match send::<RejectProductHandler, _>(&state.pool, RejectProductCommand { values }).await {
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
    match send::<SetFeaturedProductHandler, _>(&state.pool, SetFeaturedProductCommand { values }).await {
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
