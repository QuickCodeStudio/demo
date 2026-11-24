use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct StatsDailyHttpRequestsByDayAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct StatsDailyHttpRequestsByDayAuditLogHandler;

impl Handler<StatsDailyHttpRequestsByDayAuditLogQuery> for StatsDailyHttpRequestsByDayAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: StatsDailyHttpRequestsByDayAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::stats_daily_http_requests_by_day(pool, query.values).await
    }
}
