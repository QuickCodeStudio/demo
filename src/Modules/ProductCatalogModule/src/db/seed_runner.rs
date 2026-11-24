use super::config::db_type;
use super::pool::{create_pool, execute_sql_script, execute_sql_script_positional, DbPool};
use super::sql_loader::resolve_migrations_root;
use anyhow::{Context, Result};
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

fn strip_bom(text: &str) -> String {
    text.strip_prefix('\u{feff}').unwrap_or(text).to_string()
}

fn should_run() -> bool {
    !matches!(
        std::env::var("RUN_MIGRATION")
            .unwrap_or_else(|_| "yes".into())
            .to_lowercase()
            .as_str(),
        "no" | "false" | "0"
    )
}

fn quote_ident(name: &str, dialect: &str) -> String {
    match dialect {
        "postgresql" | "postgres" => format!("\"{}\"", name.replace('"', "\"\"")),
        "mysql" => format!("`{}`", name.replace('`', "``")),
        _ => format!("[{}]", name.replace(']', "]]")),
    }
}

fn list_seed_json_files(dir: &Path) -> Result<Vec<PathBuf>> {
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut files: Vec<_> = fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            p.is_file()
                && p.extension()
                    .and_then(|x| x.to_str())
                    .is_some_and(|ext| ext.eq_ignore_ascii_case("json"))
        })
        .collect();
    files.sort_by(|a, b| {
        a.file_name()
            .unwrap_or_default()
            .cmp(b.file_name().unwrap_or_default())
    });
    Ok(files)
}

fn normalize_row(row: &Map<String, Value>) -> Map<String, Value> {
    row.iter()
        .filter(|(_, v)| !v.is_null())
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect()
}

fn build_row_key(row: &Map<String, Value>, columns: &[String]) -> String {
    columns
        .iter()
        .map(|c| {
            let v = row.get(c).cloned().unwrap_or(Value::Null);
            format!("{c}={}", serde_json::to_string(&v).unwrap_or_else(|_| "null".into()))
        })
        .collect::<Vec<_>>()
        .join("|")
}

fn content_hash(content: &str) -> String {
    let digest = Sha256::digest(content.as_bytes());
    digest.iter().map(|b| format!("{b:02X}")).collect::<String>()
}

/// Seed history `__QuickCodeSeedHistory` — Nest/C# parity (InitialData *.json).
pub async fn run_quickcode_seed_data() -> Result<()> {
    if !should_run() {
        tracing::info!("RUN_MIGRATION disabled — skipping seed data");
        return Ok(());
    }

    let pool = create_pool().await?;
    ensure_seed_history(&pool).await?;

    let dir = resolve_migrations_root().join("InitialData");
    let files = list_seed_json_files(&dir)?;
    if files.is_empty() {
        tracing::info!("No QuickCode seed JSON files in {}", dir.display());
        return Ok(());
    }

    let dialect = db_type();
    for path in files {
        let name = path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_string();
        let content = strip_bom(
            &fs::read_to_string(&path).with_context(|| format!("read {}", path.display()))?,
        );
        let hash = content_hash(&content);
        if seed_applied(&pool, &name, &hash).await? {
            tracing::info!("Skipped QuickCode seed file {name}; already applied");
            continue;
        }

        tracing::info!("Applying seed {name}");
        let inserted = match apply_seed_file(&pool, &dialect, &content).await {
            Ok(n) => n,
            Err(err) => {
                tracing::error!(?err, "Seed file failed: {name}");
                continue;
            }
        };
        record_seed(&pool, &name, &hash, inserted).await?;
        tracing::info!("Applied QuickCode seed file {name} ({inserted} rows)");
    }
    Ok(())
}

async fn apply_seed_file(pool: &DbPool, dialect: &str, content: &str) -> Result<i32> {
    let root: Map<String, Value> =
        serde_json::from_str(content).context("parse seed JSON root object")?;
    let mut inserted_rows = 0i32;

    for (table_name, rows_val) in root {
        let rows = match rows_val.as_array() {
            Some(a) if !a.is_empty() => a,
            _ => continue,
        };
        let sample = match rows[0].as_object() {
            Some(o) => normalize_row(o),
            None => continue,
        };
        let unique_columns: Vec<String> = sample.keys().cloned().collect();
        if unique_columns.is_empty() {
            continue;
        }

        let existing = load_existing_keys(pool, dialect, &table_name, &unique_columns).await?;
        let mut seen = existing;

        for row_val in rows {
            let Some(obj) = row_val.as_object() else { continue };
            let row = normalize_row(obj);
            if row.is_empty() {
                continue;
            }
            let key = build_row_key(&row, &unique_columns);
            if seen.contains(&key) {
                continue;
            }

            let cols: Vec<String> = row.keys().cloned().collect();
            let values: Vec<Value> = cols.iter().map(|c| row.get(c).cloned().unwrap_or(Value::Null)).collect();
            let col_sql = cols
                .iter()
                .map(|c| quote_ident(c, dialect))
                .collect::<Vec<_>>()
                .join(", ");
            let placeholders = cols
                .iter()
                .enumerate()
                .map(|(i, _)| format!("@v{i}"))
                .collect::<Vec<_>>()
                .join(", ");
            let sql = format!(
                "INSERT INTO {} ({col_sql}) VALUES ({placeholders})",
                quote_ident(&table_name, dialect)
            );
            let _ = execute_sql_script_positional(pool, &sql, &values).await?;
            seen.insert(key);
            inserted_rows += 1;
        }
    }

    Ok(inserted_rows)
}

async fn load_existing_keys(
    pool: &DbPool,
    dialect: &str,
    table_name: &str,
    columns: &[String],
) -> Result<HashSet<String>> {
    let select_cols = columns
        .iter()
        .map(|c| quote_ident(c, dialect))
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!(
        "SELECT {select_cols} FROM {}",
        quote_ident(table_name, dialect)
    );
    let empty = HashMap::new();
    let rows = match execute_sql_script(pool, &sql, &empty).await {
        Ok(r) => r,
        Err(err) => {
            tracing::warn!(?err, "seed could not SELECT existing rows from {table_name}");
            return Ok(HashSet::new());
        }
    };

    let mut keys = HashSet::new();
    for row in rows {
        let Some(obj) = row.as_object() else { continue };
        // Result column names may differ in case from seed JSON keys.
        let mut normalized = Map::new();
        for col in columns {
            let found = obj
                .iter()
                .find(|(k, _)| k.eq_ignore_ascii_case(col))
                .map(|(_, v)| v.clone())
                .unwrap_or(Value::Null);
            normalized.insert(col.clone(), found);
        }
        keys.insert(build_row_key(&normalized, columns));
    }
    Ok(keys)
}

async fn ensure_seed_history(pool: &DbPool) -> Result<()> {
    let ddl = match db_type().as_str() {
        "postgresql" | "postgres" => r#"
CREATE TABLE IF NOT EXISTS "__QuickCodeSeedHistory" (
  "SeedFile" VARCHAR(300) NOT NULL,
  "ScriptHash" VARCHAR(128) NOT NULL,
  "AppliedAtUtc" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "InsertedRows" INT NOT NULL DEFAULT 0,
  "ElapsedMs" BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY ("SeedFile", "ScriptHash")
)"#,
        "mysql" => r#"
CREATE TABLE IF NOT EXISTS `__QuickCodeSeedHistory` (
  `SeedFile` VARCHAR(300) NOT NULL,
  `ScriptHash` VARCHAR(128) NOT NULL,
  `AppliedAtUtc` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `InsertedRows` INT NOT NULL DEFAULT 0,
  `ElapsedMs` BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`SeedFile`, `ScriptHash`)
)"#,
        _ => r#"
IF OBJECT_ID(N'dbo.__QuickCodeSeedHistory', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[__QuickCodeSeedHistory] (
    [SeedFile] NVARCHAR(300) NOT NULL,
    [ScriptHash] NVARCHAR(128) NOT NULL,
    [AppliedAtUtc] DATETIME2 NOT NULL CONSTRAINT DF_QC_Seed_AppliedAt DEFAULT SYSUTCDATETIME(),
    [InsertedRows] INT NOT NULL CONSTRAINT DF_QC_Seed_Inserted DEFAULT 0,
    [ElapsedMs] BIGINT NOT NULL CONSTRAINT DF_QC_Seed_Elapsed DEFAULT 0,
    CONSTRAINT [PK_QuickCodeSeedHistory] PRIMARY KEY ([SeedFile], [ScriptHash])
  );
END
"#,
    };
    let empty = HashMap::new();
    let _ = execute_sql_script(pool, ddl, &empty).await?;
    Ok(())
}

async fn seed_applied(pool: &DbPool, name: &str, hash: &str) -> Result<bool> {
    let sql = match db_type().as_str() {
        "postgresql" | "postgres" => {
            r#"SELECT 1 AS "Exists" FROM "__QuickCodeSeedHistory" WHERE "SeedFile" = @PRM_NAME AND "ScriptHash" = @PRM_HASH"#
        }
        "mysql" => {
            "SELECT 1 AS `Exists` FROM `__QuickCodeSeedHistory` WHERE `SeedFile` = @PRM_NAME AND `ScriptHash` = @PRM_HASH LIMIT 1"
        }
        _ => {
            "SELECT 1 AS [Exists] FROM [dbo].[__QuickCodeSeedHistory] WHERE [SeedFile] = @PRM_NAME AND [ScriptHash] = @PRM_HASH"
        }
    };
    let mut named = HashMap::new();
    named.insert("PRM_NAME".into(), Value::String(name.into()));
    named.insert("PRM_HASH".into(), Value::String(hash.into()));
    Ok(!execute_sql_script(pool, sql, &named).await?.is_empty())
}

async fn record_seed(pool: &DbPool, name: &str, hash: &str, inserted: i32) -> Result<()> {
    let sql = match db_type().as_str() {
        "postgresql" | "postgres" => {
            r#"INSERT INTO "__QuickCodeSeedHistory" ("SeedFile", "ScriptHash", "AppliedAtUtc", "InsertedRows", "ElapsedMs")
               VALUES (@PRM_NAME, @PRM_HASH, NOW(), @PRM_ROWS, 0)"#
        }
        "mysql" => {
            "INSERT INTO `__QuickCodeSeedHistory` (`SeedFile`, `ScriptHash`, `AppliedAtUtc`, `InsertedRows`, `ElapsedMs`) VALUES (@PRM_NAME, @PRM_HASH, UTC_TIMESTAMP(6), @PRM_ROWS, 0)"
        }
        _ => {
            "INSERT INTO [dbo].[__QuickCodeSeedHistory] ([SeedFile], [ScriptHash], [AppliedAtUtc], [InsertedRows], [ElapsedMs]) VALUES (@PRM_NAME, @PRM_HASH, SYSUTCDATETIME(), @PRM_ROWS, 0)"
        }
    };
    let mut named = HashMap::new();
    named.insert("PRM_NAME".into(), json!(name));
    named.insert("PRM_HASH".into(), json!(hash));
    named.insert("PRM_ROWS".into(), json!(inserted));
    let _ = execute_sql_script(pool, sql, &named).await?;
    Ok(())
}
