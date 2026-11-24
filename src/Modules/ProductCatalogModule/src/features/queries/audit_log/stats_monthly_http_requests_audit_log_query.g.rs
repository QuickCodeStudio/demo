use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct StatsMonthlyHttpRequestsAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct StatsMonthlyHttpRequestsAuditLogHandler;

impl Handler<StatsMonthlyHttpRequestsAuditLogQuery> for StatsMonthlyHttpRequestsAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: StatsMonthlyHttpRequestsAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::stats_monthly_http_requests(pool, query.values).await
    }
}
