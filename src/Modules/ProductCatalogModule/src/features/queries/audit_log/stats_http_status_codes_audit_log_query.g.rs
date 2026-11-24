use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct StatsHttpStatusCodesAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct StatsHttpStatusCodesAuditLogHandler;

impl Handler<StatsHttpStatusCodesAuditLogQuery> for StatsHttpStatusCodesAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: StatsHttpStatusCodesAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::stats_http_status_codes(pool, query.values).await
    }
}
