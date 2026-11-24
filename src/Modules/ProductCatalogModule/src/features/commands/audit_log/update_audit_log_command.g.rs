use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct UpdateAuditLogCommand {
    pub id: serde_json::Value,
    pub body: HashMap<String, Value>,
}

pub struct UpdateAuditLogHandler;

impl Handler<UpdateAuditLogCommand> for UpdateAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: UpdateAuditLogCommand) -> Result<Self::Output> {
        AuditLogRepository::update(pool, command.id, command.body).await
    }
}
