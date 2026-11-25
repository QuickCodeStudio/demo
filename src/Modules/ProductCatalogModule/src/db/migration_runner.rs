use super::config::{db_type, module_database_name, mssql_tiberius_config};
use super::pool::{create_pool, execute_sql_script, DbPool};
use super::sql_loader::{list_sql_files, resolve_migrations_root};
use anyhow::{Context, Result};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use tokio::net::TcpStream;
use tokio_util::compat::TokioAsyncWriteCompatExt;

fn should_run() -> bool {
    !matches!(
        std::env::var("RUN_MIGRATION")
            .unwrap_or_else(|_| "yes".into())
            .to_lowercase()
            .as_str(),
        "no" | "false" | "0"
    )
}

fn strip_bom(text: &str) -> String {
    text.strip_prefix('\u{feff}').unwrap_or(text).to_string()
}

fn sha256_hex_upper(text: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(text.as_bytes());
    hasher
        .finalize()
        .iter()
        .map(|b| format!("{b:02X}"))
        .collect()
}

/// Nest/C# parity: split MSSQL batches on standalone `GO` lines.
fn split_mssql_batches(sql_text: &str) -> Vec<String> {
    if !matches!(db_type().as_str(), "mssql" | "sqlserver") {
        return vec![sql_text.to_string()];
    }
    let mut batches = Vec::new();
    let mut current = String::new();
    for line in sql_text.lines() {
        if line.trim().eq_ignore_ascii_case("GO") {
            if !current.trim().is_empty() {
                batches.push(std::mem::take(&mut current));
            } else {
                current.clear();
            }
        } else {
            current.push_str(line);
            current.push('\n');
        }
    }
    if !current.trim().is_empty() {
        batches.push(current);
    }
    batches
}

/// Shared-history migration runner — `__QuickCodeSqlMigrations` (Nest/C#/Java parity).
/// Columns: MigrationId / ScriptHash / AppliedAtUtc (NOT ScriptName — that crashed Cloud Run).
pub async fn run_quickcode_sql_migrations() -> Result<()> {
    if !should_run() {
        tracing::info!("RUN_MIGRATION disabled — skipping SQL migrations");
        return Ok(());
    }

    if matches!(db_type().as_str(), "mssql" | "sqlserver") {
        ensure_mssql_database().await?;
    }

    let pool = create_pool().await?;
    ensure_history_table(&pool).await?;
    let applied = load_applied_migration_ids(&pool).await?;

    let root = resolve_migrations_root();
    let files = list_sql_files_for_dialect(&root)?;
    for path in files {
        let migration_id = path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_string();
        if applied.contains(&migration_id) {
            continue;
        }
        let sql =
            strip_bom(&fs::read_to_string(&path).with_context(|| format!("read {}", path.display()))?);
        if sql.trim().is_empty() {
            continue;
        }
        tracing::info!("Applying migration {migration_id}");
        let empty = HashMap::new();
        for batch in split_mssql_batches(&sql) {
            execute_sql_script(&pool, &batch, &empty)
                .await
                .with_context(|| format!("migration batch failed: {migration_id}"))?;
        }
        record_migration(&pool, &migration_id, &sha256_hex_upper(&sql)).await?;
    }
    Ok(())
}

/// Prefer dialect-suffixed scripts (`*.mssql.sql`) when present — Nest/C# parity.
fn list_sql_files_for_dialect(dir: &Path) -> Result<Vec<std::path::PathBuf>> {
    let all = list_sql_files(dir)?;
    let suffix = match db_type().as_str() {
        "postgresql" | "postgres" => ".postgresql.sql",
        "mysql" => ".mysql.sql",
        _ => ".mssql.sql",
    };
    let dialect: Vec<_> = all
        .iter()
        .filter(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .is_some_and(|n| n.to_ascii_lowercase().ends_with(suffix))
        })
        .cloned()
        .collect();
    if !dialect.is_empty() {
        return Ok(dialect);
    }
    Ok(all)
}

async fn ensure_history_table(pool: &DbPool) -> Result<()> {
    // Must match Nest/C#/Java: MigrationId + ScriptHash + AppliedAtUtc
    let ddl = match db_type().as_str() {
        "postgresql" | "postgres" => r#"
CREATE TABLE IF NOT EXISTS "__QuickCodeSqlMigrations" (
  "MigrationId" varchar(300) NOT NULL PRIMARY KEY,
  "ScriptHash" varchar(128) NOT NULL,
  "AppliedAtUtc" timestamp with time zone NOT NULL
)"#,
        "mysql" => r#"
CREATE TABLE IF NOT EXISTS `__QuickCodeSqlMigrations` (
  `MigrationId` varchar(300) NOT NULL PRIMARY KEY,
  `ScriptHash` varchar(128) NOT NULL,
  `AppliedAtUtc` datetime(6) NOT NULL
)"#,
        _ => r#"
IF OBJECT_ID(N'dbo.__QuickCodeSqlMigrations', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[__QuickCodeSqlMigrations] (
    [MigrationId] nvarchar(300) NOT NULL PRIMARY KEY,
    [ScriptHash] nvarchar(128) NOT NULL,
    [AppliedAtUtc] datetime2 NOT NULL
  );
END
"#,
    };
    let empty = HashMap::new();
    let _ = execute_sql_script(pool, ddl, &empty).await?;
    Ok(())
}

async fn load_applied_migration_ids(pool: &DbPool) -> Result<HashSet<String>> {
    let sql = match db_type().as_str() {
        "postgresql" | "postgres" => {
            r#"SELECT "MigrationId" FROM "__QuickCodeSqlMigrations""#
        }
        "mysql" => "SELECT `MigrationId` FROM `__QuickCodeSqlMigrations`",
        _ => "SELECT [MigrationId] FROM [dbo].[__QuickCodeSqlMigrations]",
    };
    let empty = HashMap::new();
    let rows = execute_sql_script(pool, sql, &empty).await?;
    let mut set = HashSet::new();
    for row in rows {
        let Value::Object(map) = row else {
            continue;
        };
        let id = map
            .get("MigrationId")
            .or_else(|| map.get("migrationId"))
            .or_else(|| map.get("migrationid"))
            .or_else(|| map.values().next())
            .cloned();
        let Some(v) = id else { continue };
        let s = match v {
            Value::String(s) => s,
            other => other.to_string().trim_matches('"').to_string(),
        };
        if !s.is_empty() {
            set.insert(s);
        }
    }
    Ok(set)
}

async fn record_migration(pool: &DbPool, migration_id: &str, script_hash: &str) -> Result<()> {
    let sql = match db_type().as_str() {
        "postgresql" | "postgres" => r#"
INSERT INTO "__QuickCodeSqlMigrations" ("MigrationId", "ScriptHash", "AppliedAtUtc")
VALUES (@PRM_ID, @PRM_HASH, NOW())
"#,
        "mysql" => "
INSERT INTO `__QuickCodeSqlMigrations` (`MigrationId`, `ScriptHash`, `AppliedAtUtc`)
VALUES (@PRM_ID, @PRM_HASH, UTC_TIMESTAMP(6))
",
        _ => "
INSERT INTO [dbo].[__QuickCodeSqlMigrations] ([MigrationId], [ScriptHash], [AppliedAtUtc])
VALUES (@PRM_ID, @PRM_HASH, SYSUTCDATETIME())
",
    };
    let mut named = HashMap::new();
    named.insert("PRM_ID".into(), json!(migration_id));
    named.insert("PRM_HASH".into(), json!(script_hash));
    let _ = execute_sql_script(pool, sql, &named).await?;
    Ok(())
}

async fn ensure_mssql_database() -> Result<()> {
    let db = module_database_name();
    let config = mssql_tiberius_config("master");
    let tcp = TcpStream::connect(config.get_addr())
        .await
        .with_context(|| format!("mssql ensure_db tcp {}", config.get_addr()))?;
    tcp.set_nodelay(true)?;
    let mut client = tiberius::Client::connect(config, tcp.compat_write())
        .await
        .context("mssql ensure_db login")?;
    let check = format!("IF DB_ID(N'{db}') IS NULL CREATE DATABASE [{db}]");
    client.execute(check, &[]).await?;
    Ok(())
}
