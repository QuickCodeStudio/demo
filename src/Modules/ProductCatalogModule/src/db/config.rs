use anyhow::{bail, Context, Result};
use sqlx::mysql::MySqlConnectOptions;
use sqlx::postgres::PgConnectOptions;
use sqlx::Connection;

pub fn db_type() -> String {
    std::env::var("DB_TYPE")
        .or_else(|_| std::env::var("TYPEORM_TYPE"))
        .unwrap_or_else(|_| "mssql".into())
        .to_lowercase()
}

pub fn module_database_name() -> String {
    std::env::var("DB_DATABASE").unwrap_or_else(|_| "quickcode_template0_module".into())
}

fn env(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.into())
}

/// Provision the module database if missing (same idea as Nest ensureDatabaseExists).
pub async fn ensure_database_exists() -> Result<()> {
    let db = module_database_name();
    match db_type().as_str() {
        "postgresql" | "postgres" => {
            let host = env("DB_HOST", "localhost");
            let port: u16 = env("DB_PORT", "5432").parse().unwrap_or(5432);
            let user = env("DB_USERNAME", "docker");
            let pass = env("DB_PASSWORD", "dockerf");
            let opts = PgConnectOptions::new()
                .host(&host)
                .port(port)
                .username(&user)
                .password(&pass)
                .database("postgres");
            let mut conn = sqlx::PgConnection::connect_with(&opts)
                .await
                .context("connect postgres for ensure_database")?;
            let exists: (bool,) =
                sqlx::query_as("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)")
                    .bind(&db)
                    .fetch_one(&mut conn)
                    .await?;
            if !exists.0 {
                sqlx::query(&format!("CREATE DATABASE \"{db}\""))
                    .execute(&mut conn)
                    .await?;
            }
        }
        "mysql" => {
            let host = env("DB_HOST", "localhost");
            let port: u16 = env("DB_PORT", "3306").parse().unwrap_or(3306);
            let user = env("DB_USERNAME", "docker");
            let pass = env("DB_PASSWORD", "dockerf");
            let opts = MySqlConnectOptions::new()
                .host(&host)
                .port(port)
                .username(&user)
                .password(&pass);
            let mut conn = sqlx::MySqlConnection::connect_with(&opts)
                .await
                .context("connect mysql for ensure_database")?;
            sqlx::query(&format!(
                "CREATE DATABASE IF NOT EXISTS `{db}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            ))
            .execute(&mut conn)
            .await?;
        }
        "mssql" | "sqlserver" => {
            // CREATE DATABASE runs in migration_runner for mssql (tiberius / master).
            tracing::info!("mssql ensure_database deferred to migration runner");
        }
        other => bail!("Unsupported DB_TYPE: {other}"),
    }
    Ok(())
}

pub fn sqlx_any_url() -> Result<String> {
    let host = env("DB_HOST", "localhost");
    let user = env("DB_USERNAME", "docker");
    let pass = env("DB_PASSWORD", "dockerf");
    let db = module_database_name();
    match db_type().as_str() {
        "postgresql" | "postgres" => {
            let port = env("DB_PORT", "5432");
            Ok(format!("postgres://{user}:{pass}@{host}:{port}/{db}"))
        }
        "mysql" => {
            let port = env("DB_PORT", "3306");
            Ok(format!("mysql://{user}:{pass}@{host}:{port}/{db}"))
        }
        other => bail!("sqlx Any URL not used for DB_TYPE={other}"),
    }
}
