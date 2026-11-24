use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetItemAuditLogQuery {
    pub id: serde_json::Value,
}

pub struct GetItemAuditLogHandler;

impl Handler<GetItemAuditLogQuery> for GetItemAuditLogHandler {
    type Output = Option<Value>;

    async fn handle(pool: &DbPool, query: GetItemAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::get_by_pk(pool, query.id).await
    }
}
