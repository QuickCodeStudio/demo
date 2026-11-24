use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct StatsYearlyHttpRequestsAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct StatsYearlyHttpRequestsAuditLogHandler;

impl Handler<StatsYearlyHttpRequestsAuditLogQuery> for StatsYearlyHttpRequestsAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: StatsYearlyHttpRequestsAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::stats_yearly_http_requests(pool, query.values).await
    }
}
