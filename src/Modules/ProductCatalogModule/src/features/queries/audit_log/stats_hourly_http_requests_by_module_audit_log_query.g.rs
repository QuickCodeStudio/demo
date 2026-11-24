use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct StatsHourlyHttpRequestsByModuleAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct StatsHourlyHttpRequestsByModuleAuditLogHandler;

impl Handler<StatsHourlyHttpRequestsByModuleAuditLogQuery> for StatsHourlyHttpRequestsByModuleAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: StatsHourlyHttpRequestsByModuleAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::stats_hourly_http_requests_by_module(pool, query.values).await
    }
}
