use super::config::{db_type, module_database_name, mssql_tiberius_config};
use super::pool::{create_pool, execute_sql_script, DbPool};
use super::sql_loader::{list_sql_files, resolve_migrations_root};
use anyhow::{Context, Result};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
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

/// Shared-history migration runner — `__QuickCodeSqlMigrations` (Nest/C# parity).
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

    let root = resolve_migrations_root();
    let files = list_sql_files(&root)?;
    for path in files {
        let name = path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_string();
        if migration_applied(&pool, &name).await? {
            continue;
        }
        let sql = strip_bom(&fs::read_to_string(&path).with_context(|| format!("read {}", path.display()))?);
        tracing::info!("Applying migration {name}");
        let empty = HashMap::new();
        execute_sql_script(&pool, &sql, &empty).await?;
        record_migration(&pool, &name).await?;
    }
    Ok(())
}

async fn ensure_history_table(pool: &DbPool) -> Result<()> {
    let ddl = match db_type().as_str() {
        "postgresql" | "postgres" => r#"
CREATE TABLE IF NOT EXISTS "__QuickCodeSqlMigrations" (
  "Id" SERIAL PRIMARY KEY,
  "ScriptName" VARCHAR(512) NOT NULL UNIQUE,
  "AppliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
)"#,
        "mysql" => r#"
CREATE TABLE IF NOT EXISTS `__QuickCodeSqlMigrations` (
  `Id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ScriptName` VARCHAR(512) NOT NULL UNIQUE,
  `AppliedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)"#,
        _ => r#"
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = '__QuickCodeSqlMigrations')
CREATE TABLE [__QuickCodeSqlMigrations] (
  [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  [ScriptName] NVARCHAR(512) NOT NULL UNIQUE,
  [AppliedAt] DATETIME2 NOT NULL CONSTRAINT DF_QC_Mig_AppliedAt DEFAULT SYSUTCDATETIME()
)"#,
    };
    let empty = HashMap::new();
    let _ = execute_sql_script(pool, ddl, &empty).await?;
    Ok(())
}

async fn migration_applied(pool: &DbPool, name: &str) -> Result<bool> {
    let sql = match db_type().as_str() {
        "postgresql" | "postgres" => {
            r#"SELECT 1 AS "Exists" FROM "__QuickCodeSqlMigrations" WHERE "ScriptName" = @PRM_NAME"#
        }
        "mysql" => {
            "SELECT 1 AS `Exists` FROM `__QuickCodeSqlMigrations` WHERE `ScriptName` = @PRM_NAME"
        }
        _ => {
            "SELECT 1 AS [Exists] FROM [__QuickCodeSqlMigrations] WHERE [ScriptName] = @PRM_NAME"
        }
    };
    let mut named = HashMap::new();
    named.insert("PRM_NAME".into(), Value::String(name.into()));
    let rows = execute_sql_script(pool, sql, &named).await?;
    Ok(!rows.is_empty())
}

async fn record_migration(pool: &DbPool, name: &str) -> Result<()> {
    let sql = match db_type().as_str() {
        "postgresql" | "postgres" => {
            r#"INSERT INTO "__QuickCodeSqlMigrations" ("ScriptName") VALUES (@PRM_NAME)"#
        }
        "mysql" => {
            "INSERT INTO `__QuickCodeSqlMigrations` (`ScriptName`) VALUES (@PRM_NAME)"
        }
        _ => "INSERT INTO [__QuickCodeSqlMigrations] ([ScriptName]) VALUES (@PRM_NAME)",
    };
    let mut named = HashMap::new();
    named.insert("PRM_NAME".into(), json!(name));
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
