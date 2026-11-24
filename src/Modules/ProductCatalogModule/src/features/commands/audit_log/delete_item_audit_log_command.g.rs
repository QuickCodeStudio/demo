use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;

pub struct DeleteItemAuditLogCommand {
    pub id: serde_json::Value,
}

pub struct DeleteItemAuditLogHandler;

impl Handler<DeleteItemAuditLogCommand> for DeleteItemAuditLogHandler {
    type Output = Vec<serde_json::Value>;

    async fn handle(pool: &DbPool, command: DeleteItemAuditLogCommand) -> Result<Self::Output> {
        AuditLogRepository::delete(pool, command.id).await
    }
}
