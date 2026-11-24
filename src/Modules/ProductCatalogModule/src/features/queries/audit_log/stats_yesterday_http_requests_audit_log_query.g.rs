use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct StatsYesterdayHttpRequestsAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct StatsYesterdayHttpRequestsAuditLogHandler;

impl Handler<StatsYesterdayHttpRequestsAuditLogQuery> for StatsYesterdayHttpRequestsAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: StatsYesterdayHttpRequestsAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::stats_yesterday_http_requests(pool, query.values).await
    }
}
