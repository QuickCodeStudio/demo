use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct StatsWeeklyHttpRequestsAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct StatsWeeklyHttpRequestsAuditLogHandler;

impl Handler<StatsWeeklyHttpRequestsAuditLogQuery> for StatsWeeklyHttpRequestsAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: StatsWeeklyHttpRequestsAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::stats_weekly_http_requests(pool, query.values).await
    }
}
