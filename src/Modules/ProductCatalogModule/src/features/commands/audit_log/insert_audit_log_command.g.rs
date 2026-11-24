use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct InsertAuditLogCommand {
    pub body: HashMap<String, Value>,
}

pub struct InsertAuditLogHandler;

impl Handler<InsertAuditLogCommand> for InsertAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: InsertAuditLogCommand) -> Result<Self::Output> {
        AuditLogRepository::insert(pool, command.body).await
    }
}
