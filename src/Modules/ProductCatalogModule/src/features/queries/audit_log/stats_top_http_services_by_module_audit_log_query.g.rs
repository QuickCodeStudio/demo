use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct StatsTopHttpServicesByModuleAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct StatsTopHttpServicesByModuleAuditLogHandler;

impl Handler<StatsTopHttpServicesByModuleAuditLogQuery> for StatsTopHttpServicesByModuleAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: StatsTopHttpServicesByModuleAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::stats_top_http_services_by_module(pool, query.values).await
    }
}
