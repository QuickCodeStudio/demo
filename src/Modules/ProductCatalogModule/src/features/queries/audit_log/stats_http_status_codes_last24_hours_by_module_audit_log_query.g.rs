use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct StatsHttpStatusCodesLast24HoursByModuleAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct StatsHttpStatusCodesLast24HoursByModuleAuditLogHandler;

impl Handler<StatsHttpStatusCodesLast24HoursByModuleAuditLogQuery> for StatsHttpStatusCodesLast24HoursByModuleAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: StatsHttpStatusCodesLast24HoursByModuleAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::stats_http_status_codes_last24_hours_by_module(pool, query.values).await
    }
}
