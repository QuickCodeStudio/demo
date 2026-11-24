use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct StatsLastHourHttpRequestsAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct StatsLastHourHttpRequestsAuditLogHandler;

impl Handler<StatsLastHourHttpRequestsAuditLogQuery> for StatsLastHourHttpRequestsAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: StatsLastHourHttpRequestsAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::stats_last_hour_http_requests(pool, query.values).await
    }
}
