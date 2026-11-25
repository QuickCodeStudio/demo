use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct AuditLogService;

impl AuditLogService {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        AuditLogRepository::list(pool, page, page_size).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        AuditLogRepository::count(pool).await
    }

    pub async fn get_item(pool: &DbPool, id: Value) -> Result<Option<Value>> {
        AuditLogRepository::get_by_pk(pool, id).await
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        AuditLogRepository::insert(pool, body).await
    }

    pub async fn update(pool: &DbPool, id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        AuditLogRepository::update(pool, id, body).await
    }

    pub async fn delete(pool: &DbPool, id: Value) -> Result<Vec<Value>> {
        AuditLogRepository::delete(pool, id).await
    }

    pub async fn get_recent_http_requests(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::get_recent_http_requests(pool, values).await
    }

    pub async fn get_recent_http_requests_by_module(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::get_recent_http_requests_by_module(pool, values).await
    }

    pub async fn stats_today_http_requests(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::stats_today_http_requests(pool, values).await
    }

    pub async fn stats_last_hour_http_requests(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::stats_last_hour_http_requests(pool, values).await
    }

    pub async fn stats_yesterday_http_requests(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::stats_yesterday_http_requests(pool, values).await
    }

    pub async fn stats_weekly_http_requests(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::stats_weekly_http_requests(pool, values).await
    }

    pub async fn stats_monthly_http_requests(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::stats_monthly_http_requests(pool, values).await
    }

    pub async fn stats_yearly_http_requests(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::stats_yearly_http_requests(pool, values).await
    }

    pub async fn stats_daily_http_requests_by_day(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::stats_daily_http_requests_by_day(pool, values).await
    }

    pub async fn stats_daily_http_requests_by_day_by_module(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::stats_daily_http_requests_by_day_by_module(pool, values).await
    }

    pub async fn stats_hourly_http_requests_by_module(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::stats_hourly_http_requests_by_module(pool, values).await
    }

    pub async fn stats_total_http_requests_by_module(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::stats_total_http_requests_by_module(pool, values).await
    }

    pub async fn stats_http_status_codes_last24_hours_by_module(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::stats_http_status_codes_last24_hours_by_module(pool, values).await
    }

    pub async fn stats_http_status_codes(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::stats_http_status_codes(pool, values).await
    }

    pub async fn stats_http_status_codes_by_module(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::stats_http_status_codes_by_module(pool, values).await
    }

    pub async fn stats_top_http_services_by_module(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AuditLogRepository::stats_top_http_services_by_module(pool, values).await
    }
}
