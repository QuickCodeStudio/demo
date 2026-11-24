use super::config::{db_type, module_database_name, sqlx_any_url};
use super::sql_loader::bind_named_params_map;
use anyhow::{bail, Context, Result};
use serde_json::Value;
use sqlx::any::AnyPoolOptions;
use sqlx::{Any, Column, Pool, Row};
use std::collections::HashMap;
use std::sync::Arc;
use tiberius::{AuthMethod, Client, Config};
use tokio::net::TcpStream;
use tokio_util::compat::{Compat, TokioAsyncWriteCompatExt};

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.into())
}

#[derive(Clone)]
pub enum DbPool {
    Sqlx(Pool<Any>),
    Mssql(Arc<tokio::sync::Mutex<()>>), // connection-per-call for simplicity
}

pub async fn create_pool() -> Result<DbPool> {
    match db_type().as_str() {
        "postgresql" | "postgres" | "mysql" => {
            sqlx::any::install_default_drivers();
            let url = sqlx_any_url()?;
            let pool = AnyPoolOptions::new()
                .max_connections(10)
                .connect(&url)
                .await
                .context("sqlx Any pool connect")?;
            Ok(DbPool::Sqlx(pool))
        }
        "mssql" | "sqlserver" => Ok(DbPool::Mssql(Arc::new(tokio::sync::Mutex::new(())))),
        other => bail!("Unsupported DB_TYPE for pool: {other}"),
    }
}

async fn mssql_client() -> Result<Client<Compat<TcpStream>>> {
    let mut config = Config::new();
    config.host(env_or("DB_HOST", "localhost"));
    config.port(env_or("DB_PORT", "1433").parse().unwrap_or(1433));
    config.authentication(AuthMethod::sql_server(
        env_or("DB_USERNAME", "sa"),
        env_or("DB_PASSWORD", "Pass@word"),
    ));
    config.database(module_database_name());
    config.trust_cert();
    let tcp = TcpStream::connect(config.get_addr()).await?;
    tcp.set_nodelay(true)?;
    Ok(Client::connect(config, tcp.compat_write()).await?)
}

/// Nest `executeSqlScript` positional parity — bind `@Name` tokens in appearance order.
pub async fn execute_sql_script_positional(
    pool: &DbPool,
    sql: &str,
    values: &[Value],
) -> Result<Vec<Value>> {
    let dialect = db_type();
    let (text, params) = bind_positional_values(sql, values, &dialect);
    execute_bound(pool, &text, &params).await
}

fn bind_positional_values(
    sql: &str,
    values: &[Value],
    db_type: &str,
) -> (String, Vec<Value>) {
    use once_cell::sync::Lazy;
    use regex::Regex;
    static RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"@([A-Za-z_][A-Za-z0-9_]*)").unwrap());
    let mut params = Vec::new();
    let mut idx = 0usize;
    let text = RE.replace_all(sql, |caps: &regex::Captures| {
        let name = &caps[1];
        if name.chars().all(|c| c.is_ascii_digit()) {
            return caps[0].to_string();
        }
        let v = values.get(idx).cloned().unwrap_or(Value::Null);
        idx += 1;
        params.push(v);
        match db_type {
            "postgresql" | "postgres" => format!("${}", params.len()),
            "mysql" => "?".to_string(),
            _ => format!("@P{}", params.len()),
        }
    });
    (text.into_owned(), params)
}

async fn execute_bound(pool: &DbPool, text: &str, params: &[Value]) -> Result<Vec<Value>> {
    match pool {
        DbPool::Sqlx(p) => {
            let mut q = sqlx::query(text);
            for pval in params {
                q = bind_json(q, pval);
            }
            let rows = q.fetch_all(p).await?;
            let mut out = Vec::with_capacity(rows.len());
            for row in rows {
                let mut obj = serde_json::Map::new();
                for (i, col) in row.columns().iter().enumerate() {
                    let name = col.name().to_string();
                    let v = row_value_to_json(&row, i);
                    obj.insert(name, v);
                }
                out.push(Value::Object(obj));
            }
            Ok(out)
        }
        DbPool::Mssql(_) => {
            let _guard = match pool {
                DbPool::Mssql(g) => g.lock().await,
                _ => unreachable!(),
            };
            let mut client = mssql_client().await?;
            let mut query = tiberius::Query::new(text);
            for pval in params {
                bind_tiberius(&mut query, pval);
            }
            let stream = query.query(&mut client).await?;
            let rows = stream.into_results().await?;
            let mut out = Vec::new();
            for set in rows {
                for row in set {
                    let mut obj = serde_json::Map::new();
                    for (i, col) in row.columns().iter().enumerate() {
                        let name = col.name().to_string();
                        obj.insert(name, tiberius_cell_to_json(&row, i));
                    }
                    out.push(Value::Object(obj));
                }
            }
            Ok(out)
        }
    }
}

/// Execute a named-parameter SQL script (CRUD / Query / Command). Returns rows as JSON objects.
pub async fn execute_sql_script(
    pool: &DbPool,
    sql: &str,
    named: &HashMap<String, Value>,
) -> Result<Vec<Value>> {
    let dialect = db_type();
    let (text, params) = bind_named_params_map(sql, named, &dialect);
    execute_bound(pool, &text, &params).await
}

/// INSERT/UPDATE/DELETE row count. Does not expect a result set.
pub async fn execute_sql_script_positional_count(
    pool: &DbPool,
    sql: &str,
    values: &[Value],
) -> Result<i64> {
    let dialect = db_type();
    let (text, params) = bind_positional_values(sql, values, &dialect);
    match pool {
        DbPool::Sqlx(p) => {
            let mut q = sqlx::query(&text);
            for pval in &params {
                q = bind_json(q, pval);
            }
            let result = q.execute(p).await?;
            Ok(result.rows_affected() as i64)
        }
        DbPool::Mssql(_) => {
            let _guard = match pool {
                DbPool::Mssql(g) => g.lock().await,
                _ => unreachable!(),
            };
            let mut client = mssql_client().await?;
            let mut query = tiberius::Query::new(text);
            for pval in &params {
                bind_tiberius(&mut query, pval);
            }
            let result = query.execute(&mut client).await?;
            Ok(result.rows_affected().iter().copied().sum::<u64>() as i64)
        }
    }
}

fn bind_json<'q>(
    q: sqlx::query::Query<'q, sqlx::Any, sqlx::any::AnyArguments<'q>>,
    v: &'q Value,
) -> sqlx::query::Query<'q, sqlx::Any, sqlx::any::AnyArguments<'q>> {
    match v {
        Value::Null => q.bind(None::<String>),
        Value::Bool(b) => q.bind(*b),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                q.bind(i)
            } else if let Some(f) = n.as_f64() {
                q.bind(f)
            } else {
                q.bind(n.to_string())
            }
        }
        Value::String(s) => q.bind(s.clone()),
        other => q.bind(other.to_string()),
    }
}

fn bind_tiberius(query: &mut tiberius::Query<'_>, v: &Value) {
    match v {
        Value::Null => {
            query.bind(None::<String>);
        }
        Value::Bool(b) => {
            query.bind(*b);
        }
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                query.bind(i);
            } else if let Some(f) = n.as_f64() {
                query.bind(f);
            } else {
                query.bind(n.to_string());
            }
        }
        Value::String(s) => {
            query.bind(s.clone());
        }
        other => {
            query.bind(other.to_string());
        }
    }
}

fn row_value_to_json(row: &sqlx::any::AnyRow, i: usize) -> Value {
    // sqlx::Any does not decode chrono; timestamps arrive as strings for Postgres/MySQL drivers.
    if let Ok(v) = row.try_get::<Option<String>, _>(i) {
        return match v {
            Some(s) => Value::String(s),
            None => Value::Null,
        };
    }
    if let Ok(v) = row.try_get::<Option<i64>, _>(i) {
        return match v {
            Some(n) => Value::Number(n.into()),
            None => Value::Null,
        };
    }
    if let Ok(v) = row.try_get::<Option<f64>, _>(i) {
        return match v {
            Some(n) => serde_json::Number::from_f64(n)
                .map(Value::Number)
                .unwrap_or(Value::Null),
            None => Value::Null,
        };
    }
    if let Ok(v) = row.try_get::<Option<bool>, _>(i) {
        return match v {
            Some(b) => Value::Bool(b),
            None => Value::Null,
        };
    }
    Value::Null
}

fn tiberius_cell_to_json(row: &tiberius::Row, i: usize) -> Value {
    // Prefer chrono getters so datetime2/datetimeoffset survive into Nest/OpenAPI date-time JSON.
    if let Ok(v) = row.try_get::<chrono::NaiveDateTime, _>(i) {
        return match v {
            Some(dt) => Value::String(dt.format("%Y-%m-%dT%H:%M:%S%.f").to_string()),
            None => Value::Null,
        };
    }
    if let Ok(v) = row.try_get::<chrono::DateTime<chrono::FixedOffset>, _>(i) {
        return match v {
            Some(dt) => Value::String(dt.to_rfc3339()),
            None => Value::Null,
        };
    }
    if let Ok(v) = row.try_get::<chrono::DateTime<chrono::Utc>, _>(i) {
        return match v {
            Some(dt) => Value::String(dt.to_rfc3339()),
            None => Value::Null,
        };
    }
    if let Ok(v) = row.try_get::<chrono::NaiveDate, _>(i) {
        return match v {
            Some(d) => Value::String(d.format("%Y-%m-%d").to_string()),
            None => Value::Null,
        };
    }

    use tiberius::ColumnData;
    let cell = row.cells().nth(i).map(|(_, d)| d);
    match cell {
        Some(ColumnData::U8(Some(v))) => Value::Number((*v as u64).into()),
        Some(ColumnData::I16(Some(v))) => Value::Number((*v as i64).into()),
        Some(ColumnData::I32(Some(v))) => Value::Number((*v).into()),
        Some(ColumnData::I64(Some(v))) => Value::Number((*v).into()),
        Some(ColumnData::F32(Some(v))) => serde_json::Number::from_f64(*v as f64)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        Some(ColumnData::F64(Some(v))) => serde_json::Number::from_f64(*v)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        Some(ColumnData::Bit(Some(v))) => Value::Bool(*v),
        Some(ColumnData::String(Some(v))) => Value::String(v.to_string()),
        Some(ColumnData::Guid(Some(v))) => Value::String(v.to_string()),
        Some(ColumnData::Numeric(Some(v))) => {
            let s = v.to_string();
            s.parse::<serde_json::Number>()
                .map(Value::Number)
                .unwrap_or(Value::String(s))
        }
        _ => Value::Null,
    }
}
