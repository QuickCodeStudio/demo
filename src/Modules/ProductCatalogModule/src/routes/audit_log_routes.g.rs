use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post, put, delete};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use crate::cqrs::send;
use crate::features::queries::audit_log::list_audit_log_query::{ListAuditLogQuery, ListAuditLogHandler};
use crate::features::queries::audit_log::get_item_audit_log_query::{GetItemAuditLogQuery, GetItemAuditLogHandler};
use crate::features::queries::audit_log::total_item_count_audit_log_query::{TotalItemCountAuditLogQuery, TotalItemCountAuditLogHandler};
use crate::features::commands::audit_log::insert_audit_log_command::{InsertAuditLogCommand, InsertAuditLogHandler};
use crate::features::commands::audit_log::update_audit_log_command::{UpdateAuditLogCommand, UpdateAuditLogHandler};
use crate::features::commands::audit_log::delete_item_audit_log_command::{DeleteItemAuditLogCommand, DeleteItemAuditLogHandler};
use crate::features::queries::audit_log::get_recent_http_requests_audit_log_query::{GetRecentHttpRequestsAuditLogQuery, GetRecentHttpRequestsAuditLogHandler};
use crate::features::queries::audit_log::get_recent_http_requests_by_module_audit_log_query::{GetRecentHttpRequestsByModuleAuditLogQuery, GetRecentHttpRequestsByModuleAuditLogHandler};
use crate::features::queries::audit_log::stats_today_http_requests_audit_log_query::{StatsTodayHttpRequestsAuditLogQuery, StatsTodayHttpRequestsAuditLogHandler};
use crate::features::queries::audit_log::stats_last_hour_http_requests_audit_log_query::{StatsLastHourHttpRequestsAuditLogQuery, StatsLastHourHttpRequestsAuditLogHandler};
use crate::features::queries::audit_log::stats_yesterday_http_requests_audit_log_query::{StatsYesterdayHttpRequestsAuditLogQuery, StatsYesterdayHttpRequestsAuditLogHandler};
use crate::features::queries::audit_log::stats_weekly_http_requests_audit_log_query::{StatsWeeklyHttpRequestsAuditLogQuery, StatsWeeklyHttpRequestsAuditLogHandler};
use crate::features::queries::audit_log::stats_monthly_http_requests_audit_log_query::{StatsMonthlyHttpRequestsAuditLogQuery, StatsMonthlyHttpRequestsAuditLogHandler};
use crate::features::queries::audit_log::stats_yearly_http_requests_audit_log_query::{StatsYearlyHttpRequestsAuditLogQuery, StatsYearlyHttpRequestsAuditLogHandler};
use crate::features::queries::audit_log::stats_daily_http_requests_by_day_audit_log_query::{StatsDailyHttpRequestsByDayAuditLogQuery, StatsDailyHttpRequestsByDayAuditLogHandler};
use crate::features::queries::audit_log::stats_daily_http_requests_by_day_by_module_audit_log_query::{StatsDailyHttpRequestsByDayByModuleAuditLogQuery, StatsDailyHttpRequestsByDayByModuleAuditLogHandler};
use crate::features::queries::audit_log::stats_hourly_http_requests_by_module_audit_log_query::{StatsHourlyHttpRequestsByModuleAuditLogQuery, StatsHourlyHttpRequestsByModuleAuditLogHandler};
use crate::features::queries::audit_log::stats_total_http_requests_by_module_audit_log_query::{StatsTotalHttpRequestsByModuleAuditLogQuery, StatsTotalHttpRequestsByModuleAuditLogHandler};
use crate::features::queries::audit_log::stats_http_status_codes_last24_hours_by_module_audit_log_query::{StatsHttpStatusCodesLast24HoursByModuleAuditLogQuery, StatsHttpStatusCodesLast24HoursByModuleAuditLogHandler};
use crate::features::queries::audit_log::stats_http_status_codes_audit_log_query::{StatsHttpStatusCodesAuditLogQuery, StatsHttpStatusCodesAuditLogHandler};
use crate::features::queries::audit_log::stats_http_status_codes_by_module_audit_log_query::{StatsHttpStatusCodesByModuleAuditLogQuery, StatsHttpStatusCodesByModuleAuditLogHandler};
use crate::features::queries::audit_log::stats_top_http_services_by_module_audit_log_query::{StatsTopHttpServicesByModuleAuditLogQuery, StatsTopHttpServicesByModuleAuditLogHandler};
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
    match send::<ListAuditLogHandler, _>(&state.pool, ListAuditLogQuery {
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
    match send::<TotalItemCountAuditLogHandler, _>(&state.pool, TotalItemCountAuditLogQuery).await {
        Ok(n) => (StatusCode::OK, Json(json!(n))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_item(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match send::<GetItemAuditLogHandler, _>(&state.pool, GetItemAuditLogQuery { id: json!(id) }).await {
        Ok(Some(row)) => (StatusCode::OK, Json(crate::db::row_to_api(row))).into_response(),
        Ok(None) => problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn insert(State(state): State<AppState>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match send::<InsertAuditLogHandler, _>(&state.pool, InsertAuditLogCommand { body }).await {
        Ok(rows) => (
            StatusCode::CREATED,
            Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null)),
        ).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn update(State(state): State<AppState>, Path(id): Path<String>, Json(body): Json<HashMap<String, Value>>) -> impl IntoResponse {
    match send::<GetItemAuditLogHandler, _>(&state.pool, GetItemAuditLogQuery { id: json!(id) }).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match send::<UpdateAuditLogHandler, _>(&state.pool, UpdateAuditLogCommand { id: json!(id), body }).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn delete_item(State(state): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match send::<GetItemAuditLogHandler, _>(&state.pool, GetItemAuditLogQuery { id: json!(id) }).await {
        Ok(None) => return problem_json(StatusCode::NOT_FOUND, "Not found"),
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
        Ok(Some(_)) => {}
    }
    match send::<DeleteItemAuditLogHandler, _>(&state.pool, DeleteItemAuditLogCommand { id: json!(id) }).await {
        Ok(_) => (StatusCode::OK, Json(json!(true))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_recent_http_requests(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    let page: i64 = q.get("pageNumber").or_else(|| q.get("page")).and_then(|s| s.parse().ok()).unwrap_or(1);
    let size: i64 = q.get("pageSize").or_else(|| q.get("page_size")).and_then(|s| s.parse().ok()).unwrap_or(20);
    values.push(json!(((page.max(1) - 1) * size.max(1)).max(0)));
    values.push(json!(size.max(1)));
    match send::<GetRecentHttpRequestsAuditLogHandler, _>(&state.pool, GetRecentHttpRequestsAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn get_recent_http_requests_by_module(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    values.push(json!(q.get("auditLogRequestModule").or_else(|| q.get("audit_log_request_module")).cloned().unwrap_or_default()));
    let page: i64 = q.get("pageNumber").or_else(|| q.get("page")).and_then(|s| s.parse().ok()).unwrap_or(1);
    let size: i64 = q.get("pageSize").or_else(|| q.get("page_size")).and_then(|s| s.parse().ok()).unwrap_or(20);
    values.push(json!(((page.max(1) - 1) * size.max(1)).max(0)));
    values.push(json!(size.max(1)));
    match send::<GetRecentHttpRequestsByModuleAuditLogHandler, _>(&state.pool, GetRecentHttpRequestsByModuleAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn stats_today_http_requests(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    match send::<StatsTodayHttpRequestsAuditLogHandler, _>(&state.pool, StatsTodayHttpRequestsAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn stats_last_hour_http_requests(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    match send::<StatsLastHourHttpRequestsAuditLogHandler, _>(&state.pool, StatsLastHourHttpRequestsAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn stats_yesterday_http_requests(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    match send::<StatsYesterdayHttpRequestsAuditLogHandler, _>(&state.pool, StatsYesterdayHttpRequestsAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn stats_weekly_http_requests(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    match send::<StatsWeeklyHttpRequestsAuditLogHandler, _>(&state.pool, StatsWeeklyHttpRequestsAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn stats_monthly_http_requests(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    match send::<StatsMonthlyHttpRequestsAuditLogHandler, _>(&state.pool, StatsMonthlyHttpRequestsAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn stats_yearly_http_requests(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    match send::<StatsYearlyHttpRequestsAuditLogHandler, _>(&state.pool, StatsYearlyHttpRequestsAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(rows.into_iter().next().map(crate::db::row_to_api).unwrap_or(Value::Null))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn stats_daily_http_requests_by_day(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    match send::<StatsDailyHttpRequestsByDayAuditLogHandler, _>(&state.pool, StatsDailyHttpRequestsByDayAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn stats_daily_http_requests_by_day_by_module(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    match send::<StatsDailyHttpRequestsByDayByModuleAuditLogHandler, _>(&state.pool, StatsDailyHttpRequestsByDayByModuleAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn stats_hourly_http_requests_by_module(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    match send::<StatsHourlyHttpRequestsByModuleAuditLogHandler, _>(&state.pool, StatsHourlyHttpRequestsByModuleAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn stats_total_http_requests_by_module(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    match send::<StatsTotalHttpRequestsByModuleAuditLogHandler, _>(&state.pool, StatsTotalHttpRequestsByModuleAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn stats_http_status_codes_last24_hours_by_module(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    match send::<StatsHttpStatusCodesLast24HoursByModuleAuditLogHandler, _>(&state.pool, StatsHttpStatusCodesLast24HoursByModuleAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn stats_http_status_codes(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    match send::<StatsHttpStatusCodesAuditLogHandler, _>(&state.pool, StatsHttpStatusCodesAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn stats_http_status_codes_by_module(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    match send::<StatsHttpStatusCodesByModuleAuditLogHandler, _>(&state.pool, StatsHttpStatusCodesByModuleAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

async fn stats_top_http_services_by_module(State(state): State<AppState>, Query(q): Query<HashMap<String, String>>) -> impl IntoResponse {
    let mut values: Vec<Value> = Vec::new();
    match send::<StatsTopHttpServicesByModuleAuditLogHandler, _>(&state.pool, StatsTopHttpServicesByModuleAuditLogQuery { values }).await {
        Ok(rows) => (StatusCode::OK, Json(Value::Array(crate::db::rows_to_api(rows)))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))).into_response(),
    }
}

pub fn audit_log_routes() -> Router<AppState> {
    Router::new()
        .route("/api/product-catalog-module/audit-logs/count", get(count))
        .route("/api/product-catalog-module/audit-logs", get(list).post(insert))
        .route("/api/product-catalog-module/audit-logs/get-recent-http-requests", get(get_recent_http_requests))
        .route("/api/product-catalog-module/audit-logs/get-recent-http-requests-by-module", get(get_recent_http_requests_by_module))
        .route("/api/product-catalog-module/audit-logs/stats-today-http-requests", get(stats_today_http_requests))
        .route("/api/product-catalog-module/audit-logs/stats-last-hour-http-requests", get(stats_last_hour_http_requests))
        .route("/api/product-catalog-module/audit-logs/stats-yesterday-http-requests", get(stats_yesterday_http_requests))
        .route("/api/product-catalog-module/audit-logs/stats-weekly-http-requests", get(stats_weekly_http_requests))
        .route("/api/product-catalog-module/audit-logs/stats-monthly-http-requests", get(stats_monthly_http_requests))
        .route("/api/product-catalog-module/audit-logs/stats-yearly-http-requests", get(stats_yearly_http_requests))
        .route("/api/product-catalog-module/audit-logs/stats-daily-http-requests-by-day", get(stats_daily_http_requests_by_day))
        .route("/api/product-catalog-module/audit-logs/stats-daily-http-requests-by-day-by-module", get(stats_daily_http_requests_by_day_by_module))
        .route("/api/product-catalog-module/audit-logs/stats-hourly-http-requests-by-module", get(stats_hourly_http_requests_by_module))
        .route("/api/product-catalog-module/audit-logs/stats-total-http-requests-by-module", get(stats_total_http_requests_by_module))
        .route("/api/product-catalog-module/audit-logs/stats-http-status-codes-last24-hours-by-module", get(stats_http_status_codes_last24_hours_by_module))
        .route("/api/product-catalog-module/audit-logs/stats-http-status-codes", get(stats_http_status_codes))
        .route("/api/product-catalog-module/audit-logs/stats-http-status-codes-by-module", get(stats_http_status_codes_by_module))
        .route("/api/product-catalog-module/audit-logs/stats-top-http-services-by-module", get(stats_top_http_services_by_module))
        .route("/api/product-catalog-module/audit-logs/{id}", get(get_item).put(update).delete(delete_item))
}
