use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct StatsTodayHttpRequestsAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct StatsTodayHttpRequestsAuditLogHandler;

impl Handler<StatsTodayHttpRequestsAuditLogQuery> for StatsTodayHttpRequestsAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: StatsTodayHttpRequestsAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::stats_today_http_requests(pool, query.values).await
    }
}
