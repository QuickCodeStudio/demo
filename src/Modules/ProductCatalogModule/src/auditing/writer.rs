use super::audit_log::AuditLogPayload;
use crate::db::{db_type, execute_sql_script, DbPool};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use tokio::sync::{Mutex, Notify};
use tracing::{debug, error, warn};

const BATCH_SIZE: usize = 100;
const MAX_QUEUE: usize = 10_000;

#[derive(Clone)]
pub struct AuditWriterHandle {
    inner: Arc<Inner>,
}

struct Inner {
    queue: Mutex<VecDeque<AuditLogPayload>>,
    notify: Notify,
    pool: DbPool,
    running: Mutex<bool>,
}

pub fn start_audit_writer(pool: DbPool) -> AuditWriterHandle {
    let handle = AuditWriterHandle {
        inner: Arc::new(Inner {
            queue: Mutex::new(VecDeque::new()),
            notify: Notify::new(),
            pool,
            running: Mutex::new(true),
        }),
    };
    if std::env::var("SWAGGER_DUMP").ok().as_deref() == Some("1") {
        return handle;
    }
    let worker = handle.clone();
    tokio::spawn(async move { worker.run_loop().await });
    handle
}

impl AuditWriterHandle {
    pub async fn queue(&self, mut log: AuditLogPayload) {
        log.hash = Some(compute_hash(&log));
        let mut q = self.inner.queue.lock().await;
        if q.len() >= MAX_QUEUE {
            warn!(
                "Audit queue full; dropping {}/{}",
                log.entity_name, log.entity_id
            );
            return;
        }
        q.push_back(log);
        drop(q);
        self.inner.notify.notify_one();
    }

    async fn run_loop(&self) {
        loop {
            {
                let running = *self.inner.running.lock().await;
                if !running && self.inner.queue.lock().await.is_empty() {
                    break;
                }
            }
            tokio::select! {
                _ = self.inner.notify.notified() => {}
                _ = tokio::time::sleep(std::time::Duration::from_secs(5)) => {}
            }
            let mut batch = Vec::new();
            {
                let mut q = self.inner.queue.lock().await;
                while batch.len() < BATCH_SIZE {
                    match q.pop_front() {
                        Some(item) => batch.push(item),
                        None => break,
                    }
                }
            }
            if !batch.is_empty() {
                if let Err(e) = self.write_batch(&batch).await {
                    error!("Failed to write audit batch: {e:#}");
                }
            }
        }
    }

    async fn write_batch(&self, batch: &[AuditLogPayload]) -> anyhow::Result<()> {
        let dialect = db_type();
        if dialect.eq_ignore_ascii_case("inmemory") {
            return Ok(());
        }
        if let Err(e) = ensure_client_id_column(&self.inner.pool, &dialect).await {
            warn!("Could not ensure AUDIT_LOGS.CLIENT_ID column; continuing without alter: {e:#}");
        }
        let sql = insert_audit_sql(&dialect);
        for log in batch {
            let named = to_named_params(log);
            execute_sql_script(&self.inner.pool, &sql, &named).await?;
        }
        debug!("Wrote {} audit logs", batch.len());
        Ok(())
    }
}

async fn ensure_client_id_column(pool: &DbPool, db: &str) -> anyhow::Result<()> {
    let sql = match db {
        "mssql" | "sqlserver" => {
            r#"IF COL_LENGTH('dbo.AUDIT_LOGS', 'CLIENT_ID') IS NULL ALTER TABLE [dbo].[AUDIT_LOGS] ADD [CLIENT_ID] nvarchar(100) NULL;"#
        }
        "mysql" => {
            r#"ALTER TABLE `AUDIT_LOGS` ADD COLUMN IF NOT EXISTS `CLIENT_ID` varchar(100) NULL;"#
        }
        _ => r#"ALTER TABLE "AUDIT_LOGS" ADD COLUMN IF NOT EXISTS "CLIENT_ID" varchar(100) NULL;"#,
    };
    execute_sql_script(pool, sql, &HashMap::new()).await?;
    Ok(())
}

pub fn compute_hash(log: &AuditLogPayload) -> String {
    let data = format!(
        "{}|{}|{}|{}|{}|{}|{}",
        log.entity_name,
        log.entity_id,
        log.action,
        log.user_id.as_deref().unwrap_or(""),
        log.timestamp,
        log.old_values.as_deref().unwrap_or(""),
        log.new_values.as_deref().unwrap_or("")
    );
    let digest = Sha256::digest(data.as_bytes());
    base64::Engine::encode(&base64::engine::general_purpose::STANDARD, digest)
}

fn to_named_params(log: &AuditLogPayload) -> HashMap<String, serde_json::Value> {
    use serde_json::json;
    let mut m = HashMap::new();
    m.insert("Id".into(), json!(log.id));
    m.insert("EntityName".into(), json!(log.entity_name));
    m.insert("EntityId".into(), json!(log.entity_id));
    m.insert("Action".into(), json!(log.action));
    m.insert("UserId".into(), json!(log.user_id.clone().unwrap_or_default()));
    m.insert("UserName".into(), json!(log.user_name.clone().unwrap_or_default()));
    m.insert("UserGroup".into(), json!(log.user_group.clone().unwrap_or_default()));
    m.insert("Timestamp".into(), json!(log.timestamp));
    m.insert("DurationMs".into(), json!(log.duration_ms));
    m.insert("StatusCode".into(), json!(log.status_code));
    m.insert("RequestModule".into(), json!(log.request_module.clone().unwrap_or_default()));
    m.insert("RequestPath".into(), json!(log.request_path.clone().unwrap_or_default()));
    m.insert("OldValues".into(), json!(log.old_values.clone().unwrap_or_default()));
    m.insert("NewValues".into(), json!(log.new_values.clone().unwrap_or_default()));
    m.insert("ChangedColumns".into(), json!(log.changed_columns.clone().unwrap_or_default()));
    m.insert("IsChanged".into(), json!(log.is_changed));
    m.insert("ChangeSummary".into(), json!(log.change_summary.clone().unwrap_or_default()));
    m.insert("IpAddress".into(), json!(log.ip_address.clone().unwrap_or_default()));
    m.insert("UserAgent".into(), json!(log.user_agent.clone().unwrap_or_default()));
    m.insert("ClientId".into(), json!(log.client_id.clone().unwrap_or_default()));
    m.insert("CorrelationId".into(), json!(log.correlation_id.clone().unwrap_or_default()));
    m.insert("IsSuccess".into(), json!(log.is_success));
    m.insert("ErrorMessage".into(), json!(log.error_message.clone().unwrap_or_default()));
    m.insert("Hash".into(), json!(log.hash.clone().unwrap_or_default()));
    m
}

fn insert_audit_sql(db: &str) -> String {
    match db {
        "mssql" | "sqlserver" => r#"INSERT INTO [dbo].[AUDIT_LOGS] ([ID], [ENTITY_NAME], [ENTITY_ID], [ACTION], [USER_ID], [USER_NAME], [USER_GROUP], [TIMESTAMP], [DURATION_MS], [STATUS_CODE], [REQUEST_MODULE], [REQUEST_PATH], [OLD_VALUES], [NEW_VALUES], [CHANGED_COLUMNS], [IS_CHANGED], [CHANGE_SUMMARY], [IP_ADDRESS], [USER_AGENT], [CLIENT_ID], [CORRELATION_ID], [IS_SUCCESS], [ERROR_MESSAGE], [HASH])
VALUES (@Id, @EntityName, @EntityId, @Action, @UserId, @UserName, @UserGroup, @Timestamp, @DurationMs, @StatusCode, @RequestModule, @RequestPath, @OldValues, @NewValues, @ChangedColumns, @IsChanged, @ChangeSummary, @IpAddress, @UserAgent, @ClientId, @CorrelationId, @IsSuccess, @ErrorMessage, @Hash);"#.into(),
        "mysql" => r#"INSERT INTO `AUDIT_LOGS` (`ID`, `ENTITY_NAME`, `ENTITY_ID`, `ACTION`, `USER_ID`, `USER_NAME`, `USER_GROUP`, `TIMESTAMP`, `DURATION_MS`, `STATUS_CODE`, `REQUEST_MODULE`, `REQUEST_PATH`, `OLD_VALUES`, `NEW_VALUES`, `CHANGED_COLUMNS`, `IS_CHANGED`, `CHANGE_SUMMARY`, `IP_ADDRESS`, `USER_AGENT`, `CLIENT_ID`, `CORRELATION_ID`, `IS_SUCCESS`, `ERROR_MESSAGE`, `HASH`)
VALUES (@Id, @EntityName, @EntityId, @Action, @UserId, @UserName, @UserGroup, @Timestamp, @DurationMs, @StatusCode, @RequestModule, @RequestPath, @OldValues, @NewValues, @ChangedColumns, @IsChanged, @ChangeSummary, @IpAddress, @UserAgent, @ClientId, @CorrelationId, @IsSuccess, @ErrorMessage, @Hash);"#.into(),
        _ => r#"INSERT INTO "AUDIT_LOGS" ("ID", "ENTITY_NAME", "ENTITY_ID", "ACTION", "USER_ID", "USER_NAME", "USER_GROUP", "TIMESTAMP", "DURATION_MS", "STATUS_CODE", "REQUEST_MODULE", "REQUEST_PATH", "OLD_VALUES", "NEW_VALUES", "CHANGED_COLUMNS", "IS_CHANGED", "CHANGE_SUMMARY", "IP_ADDRESS", "USER_AGENT", "CLIENT_ID", "CORRELATION_ID", "IS_SUCCESS", "ERROR_MESSAGE", "HASH")
VALUES (@Id, @EntityName, @EntityId, @Action, @UserId, @UserName, @UserGroup, @Timestamp, @DurationMs, @StatusCode, @RequestModule, @RequestPath, @OldValues, @NewValues, @ChangedColumns, @IsChanged, @ChangeSummary, @IpAddress, @UserAgent, @ClientId, @CorrelationId, @IsSuccess, @ErrorMessage, @Hash);"#.into(),
    }
}
