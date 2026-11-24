use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;

pub struct TotalItemCountAuditLogQuery;

pub struct TotalItemCountAuditLogHandler;

impl Handler<TotalItemCountAuditLogQuery> for TotalItemCountAuditLogHandler {
    type Output = i64;

    async fn handle(pool: &DbPool, _query: TotalItemCountAuditLogQuery) -> Result<Self::Output> {
        let rows = AuditLogRepository::count(pool).await?;
        Ok(crate::db::scalar_number(&rows))
    }
}
