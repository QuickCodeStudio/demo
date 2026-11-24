use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct StatsTotalHttpRequestsByModuleAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct StatsTotalHttpRequestsByModuleAuditLogHandler;

impl Handler<StatsTotalHttpRequestsByModuleAuditLogQuery> for StatsTotalHttpRequestsByModuleAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: StatsTotalHttpRequestsByModuleAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::stats_total_http_requests_by_module(pool, query.values).await
    }
}
