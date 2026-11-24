use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetRecentHttpRequestsByModuleAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct GetRecentHttpRequestsByModuleAuditLogHandler;

impl Handler<GetRecentHttpRequestsByModuleAuditLogQuery> for GetRecentHttpRequestsByModuleAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetRecentHttpRequestsByModuleAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::get_recent_http_requests_by_module(pool, query.values).await
    }
}
