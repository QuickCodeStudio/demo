use crate::db::{execute_sql_script, execute_sql_script_positional, execute_sql_script_positional_count, load_sql, DbPool};
use anyhow::Result;
use serde_json::{json, Value};
use std::collections::HashMap;

fn pick(body: &HashMap<String, Value>, snake: &str, pascal: &str) -> Value {
    body.get(snake)
        .cloned()
        .or_else(|| body.get(pascal).cloned())
        .or_else(|| {
            let camel: String = {
                let mut chars = pascal.chars();
                match chars.next() {
                    None => String::new(),
                    Some(f) => f.to_lowercase().collect::<String>() + chars.as_str(),
                }
            };
            body.get(&camel).cloned()
        })
        .unwrap_or(Value::Null)
}

pub struct AuditLogRepository;

impl AuditLogRepository {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Crud", "List")?;
        let offset = ((page.max(1) - 1) * page_size.max(1)).max(0);
        let mut named = HashMap::new();
        named.insert("PRM_QC_LIST_OFFSET".into(), json!(offset));
        named.insert("PRM_QC_LIST_PAGE_SIZE".into(), json!(page_size.max(1)));
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Crud", "Count")?;
        let named = HashMap::new();
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn get_by_pk(pool: &DbPool, id: Value) -> Result<Option<Value>> {
        let sql = load_sql("AuditLog", "Crud", "GetByPk")?;
        let mut named = HashMap::new();
        named.insert("PRM_AUDIT_LOG_ID".into(), id);
        let rows = execute_sql_script(pool, &sql, &named).await?;
        Ok(rows.into_iter().next())
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Crud", "Insert")?;
        let mut named = HashMap::new();
        named.insert("PRM_AUDIT_LOG_ID".into(), pick(&body, "id", "Id"));
        named.insert("PRM_AUDIT_LOG_ENTITY_NAME".into(), pick(&body, "entity_name", "EntityName"));
        named.insert("PRM_AUDIT_LOG_ENTITY_ID".into(), pick(&body, "entity_id", "EntityId"));
        named.insert("PRM_AUDIT_LOG_ACTION".into(), pick(&body, "action", "Action"));
        named.insert("PRM_AUDIT_LOG_USER_ID".into(), pick(&body, "user_id", "UserId"));
        named.insert("PRM_AUDIT_LOG_USER_NAME".into(), pick(&body, "user_name", "UserName"));
        named.insert("PRM_AUDIT_LOG_USER_GROUP".into(), pick(&body, "user_group", "UserGroup"));
        named.insert("PRM_AUDIT_LOG_TIMESTAMP".into(), pick(&body, "timestamp", "Timestamp"));
        named.insert("PRM_AUDIT_LOG_DURATION_MS".into(), pick(&body, "duration_ms", "DurationMs"));
        named.insert("PRM_AUDIT_LOG_STATUS_CODE".into(), pick(&body, "status_code", "StatusCode"));
        named.insert("PRM_AUDIT_LOG_REQUEST_MODULE".into(), pick(&body, "request_module", "RequestModule"));
        named.insert("PRM_AUDIT_LOG_REQUEST_PATH".into(), pick(&body, "request_path", "RequestPath"));
        named.insert("PRM_AUDIT_LOG_OLD_VALUES".into(), pick(&body, "old_values", "OldValues"));
        named.insert("PRM_AUDIT_LOG_NEW_VALUES".into(), pick(&body, "new_values", "NewValues"));
        named.insert("PRM_AUDIT_LOG_CHANGED_COLUMNS".into(), pick(&body, "changed_columns", "ChangedColumns"));
        named.insert("PRM_AUDIT_LOG_IS_CHANGED".into(), pick(&body, "is_changed", "IsChanged"));
        named.insert("PRM_AUDIT_LOG_CHANGE_SUMMARY".into(), pick(&body, "change_summary", "ChangeSummary"));
        named.insert("PRM_AUDIT_LOG_IP_ADDRESS".into(), pick(&body, "ip_address", "IpAddress"));
        named.insert("PRM_AUDIT_LOG_USER_AGENT".into(), pick(&body, "user_agent", "UserAgent"));
        named.insert("PRM_AUDIT_LOG_CLIENT_ID".into(), pick(&body, "client_id", "ClientId"));
        named.insert("PRM_AUDIT_LOG_CORRELATION_ID".into(), pick(&body, "correlation_id", "CorrelationId"));
        named.insert("PRM_AUDIT_LOG_IS_SUCCESS".into(), pick(&body, "is_success", "IsSuccess"));
        named.insert("PRM_AUDIT_LOG_ERROR_MESSAGE".into(), pick(&body, "error_message", "ErrorMessage"));
        named.insert("PRM_AUDIT_LOG_HASH".into(), pick(&body, "hash", "Hash"));
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn update(pool: &DbPool, id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Crud", "Update")?;
        let mut named = HashMap::new();
        named.insert("PRM_AUDIT_LOG_ENTITY_NAME".into(), pick(&body, "entity_name", "EntityName"));
        named.insert("PRM_AUDIT_LOG_ENTITY_ID".into(), pick(&body, "entity_id", "EntityId"));
        named.insert("PRM_AUDIT_LOG_ACTION".into(), pick(&body, "action", "Action"));
        named.insert("PRM_AUDIT_LOG_USER_ID".into(), pick(&body, "user_id", "UserId"));
        named.insert("PRM_AUDIT_LOG_USER_NAME".into(), pick(&body, "user_name", "UserName"));
        named.insert("PRM_AUDIT_LOG_USER_GROUP".into(), pick(&body, "user_group", "UserGroup"));
        named.insert("PRM_AUDIT_LOG_TIMESTAMP".into(), pick(&body, "timestamp", "Timestamp"));
        named.insert("PRM_AUDIT_LOG_DURATION_MS".into(), pick(&body, "duration_ms", "DurationMs"));
        named.insert("PRM_AUDIT_LOG_STATUS_CODE".into(), pick(&body, "status_code", "StatusCode"));
        named.insert("PRM_AUDIT_LOG_REQUEST_MODULE".into(), pick(&body, "request_module", "RequestModule"));
        named.insert("PRM_AUDIT_LOG_REQUEST_PATH".into(), pick(&body, "request_path", "RequestPath"));
        named.insert("PRM_AUDIT_LOG_OLD_VALUES".into(), pick(&body, "old_values", "OldValues"));
        named.insert("PRM_AUDIT_LOG_NEW_VALUES".into(), pick(&body, "new_values", "NewValues"));
        named.insert("PRM_AUDIT_LOG_CHANGED_COLUMNS".into(), pick(&body, "changed_columns", "ChangedColumns"));
        named.insert("PRM_AUDIT_LOG_IS_CHANGED".into(), pick(&body, "is_changed", "IsChanged"));
        named.insert("PRM_AUDIT_LOG_CHANGE_SUMMARY".into(), pick(&body, "change_summary", "ChangeSummary"));
        named.insert("PRM_AUDIT_LOG_IP_ADDRESS".into(), pick(&body, "ip_address", "IpAddress"));
        named.insert("PRM_AUDIT_LOG_USER_AGENT".into(), pick(&body, "user_agent", "UserAgent"));
        named.insert("PRM_AUDIT_LOG_CLIENT_ID".into(), pick(&body, "client_id", "ClientId"));
        named.insert("PRM_AUDIT_LOG_CORRELATION_ID".into(), pick(&body, "correlation_id", "CorrelationId"));
        named.insert("PRM_AUDIT_LOG_IS_SUCCESS".into(), pick(&body, "is_success", "IsSuccess"));
        named.insert("PRM_AUDIT_LOG_ERROR_MESSAGE".into(), pick(&body, "error_message", "ErrorMessage"));
        named.insert("PRM_AUDIT_LOG_HASH".into(), pick(&body, "hash", "Hash"));
        named.insert("PRM_AUDIT_LOG_ID".into(), id);
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn delete(pool: &DbPool, id: Value) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Crud", "Delete")?;
        let mut named = HashMap::new();
        named.insert("PRM_AUDIT_LOG_ID".into(), id);
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn get_recent_http_requests(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "GetRecentHttpRequests")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn get_recent_http_requests_by_module(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "GetRecentHttpRequestsByModule")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn stats_today_http_requests(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "StatsTodayHttpRequests")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn stats_last_hour_http_requests(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "StatsLastHourHttpRequests")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn stats_yesterday_http_requests(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "StatsYesterdayHttpRequests")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn stats_weekly_http_requests(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "StatsWeeklyHttpRequests")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn stats_monthly_http_requests(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "StatsMonthlyHttpRequests")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn stats_yearly_http_requests(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "StatsYearlyHttpRequests")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn stats_daily_http_requests_by_day(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "StatsDailyHttpRequestsByDay")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn stats_daily_http_requests_by_day_by_module(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "StatsDailyHttpRequestsByDayByModule")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn stats_hourly_http_requests_by_module(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "StatsHourlyHttpRequestsByModule")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn stats_total_http_requests_by_module(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "StatsTotalHttpRequestsByModule")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn stats_http_status_codes_last24_hours_by_module(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "StatsHttpStatusCodesLast24HoursByModule")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn stats_http_status_codes(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "StatsHttpStatusCodes")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn stats_http_status_codes_by_module(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "StatsHttpStatusCodesByModule")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn stats_top_http_services_by_module(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AuditLog", "Query", "StatsTopHttpServicesByModule")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

}
