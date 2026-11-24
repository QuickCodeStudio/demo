use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::audit_log_repository::AuditLogRepository;
use anyhow::Result;
use serde_json::Value;

pub struct StatsDailyHttpRequestsByDayByModuleAuditLogQuery {
    pub values: Vec<Value>,
}

pub struct StatsDailyHttpRequestsByDayByModuleAuditLogHandler;

impl Handler<StatsDailyHttpRequestsByDayByModuleAuditLogQuery> for StatsDailyHttpRequestsByDayByModuleAuditLogHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: StatsDailyHttpRequestsByDayByModuleAuditLogQuery) -> Result<Self::Output> {
        AuditLogRepository::stats_daily_http_requests_by_day_by_module(pool, query.values).await
    }
}
