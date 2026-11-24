use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct StatsHttpStatusCodesByModuleAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct StatsHttpStatusCodesByModuleAuditLogHandler;

impl Handler<StatsHttpStatusCodesByModuleAuditLogQuery> for StatsHttpStatusCodesByModuleAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: StatsHttpStatusCodesByModuleAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::stats_http_status_codes_by_module(pool, query.values).await
    }
}
