use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct ListAuditLogQuery {
    pub page: i64,
    pub size: i64,
    pub include_count: bool,
}

pub struct ListAuditLogResult {
    pub items: Vec<Value>,
    pub total_count: Option<i64>,
}

pub struct ListAuditLogHandler;

impl Handler<ListAuditLogQuery> for ListAuditLogHandler {
    type Output = ListAuditLogResult;

    async fn handle(pool: &DbPool, query: ListAuditLogQuery) -> Result<Self::Output> {
        let rows = AuditLogRepository::list(pool, query.page, query.size).await?;
        let total_count = if query.include_count {
            let count_rows = AuditLogRepository::count(pool).await?;
            Some(crate::db::scalar_number(&count_rows))
        } else {
            None
        };
        Ok(ListAuditLogResult { items: rows, total_count })
    }
}
