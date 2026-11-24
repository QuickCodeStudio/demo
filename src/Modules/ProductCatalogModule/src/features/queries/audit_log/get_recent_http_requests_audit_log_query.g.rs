use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetRecentHttpRequestsAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct GetRecentHttpRequestsAuditLogHandler;

impl Handler<GetRecentHttpRequestsAuditLogQuery> for GetRecentHttpRequestsAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetRecentHttpRequestsAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::get_recent_http_requests(pool, query.values).await
    }
}
