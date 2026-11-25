use anyhow::{bail, Context, Result};
use sqlx::mysql::MySqlConnectOptions;
use sqlx::postgres::PgConnectOptions;
use sqlx::Connection;
use std::sync::Once;
use tiberius::{AuthMethod, Config, EncryptionLevel};

static APPLY_CONN_STRING: Once = Once::new();

/// Cloud Run module workflows inject C# ADO.NET READ/WRITE_CONNECTION_STRING.
/// Nest/Rust/Java expect DB_* — hydrate once before any pool/migrate call.
pub fn apply_connection_string_env_fallback() {
    APPLY_CONN_STRING.call_once(|| {
        if env_nonempty("DB_HOST") {
            return;
        }
        let raw = std::env::var("READ_CONNECTION_STRING")
            .or_else(|_| std::env::var("WRITE_CONNECTION_STRING"))
            .unwrap_or_default();
        let raw = raw.trim();
        if raw.is_empty() {
            return;
        }
        let map = parse_ado_style(raw);
        let Some(host_raw) = first_map(
            &map,
            &["data source", "server", "host", "addr", "address"],
        ) else {
            return;
        };
        let (host, port_from_host) = split_host_port(host_raw);
        set_env("DB_HOST", &host);
        if let Some(db) = first_map(&map, &["initial catalog", "database", "db"]) {
            set_env("DB_DATABASE", db);
        }
        if let Some(user) = first_map(&map, &["user id", "uid", "username", "user"]) {
            set_env("DB_USERNAME", user);
        }
        if let Some(pass) = first_map(&map, &["password", "pwd"]) {
            set_env("DB_PASSWORD", pass);
        }
        let port = first_map(&map, &["port"])
            .map(|s| s.to_string())
            .or(port_from_host)
            .or_else(|| {
                if looks_like_mssql(&map) {
                    Some("1433".into())
                } else {
                    None
                }
            });
        if let Some(p) = port {
            set_env("DB_PORT", &p);
        }
        if !env_nonempty("DB_TYPE") {
            if looks_like_mssql(&map) {
                set_env("DB_TYPE", "mssql");
            } else if map.contains_key("uid") || map.contains_key("pwd") || map.contains_key("server")
            {
                set_env("DB_TYPE", "mysql");
            } else if map.contains_key("host") || map.contains_key("username") {
                set_env("DB_TYPE", "postgresql");
            }
        }
    });
}

fn env_nonempty(key: &str) -> bool {
    std::env::var(key).ok().filter(|s| !s.trim().is_empty()).is_some()
}

fn set_env(key: &str, value: &str) {
    // SAFETY: called once before Tokio workers touch DB env (Once).
    unsafe { std::env::set_var(key, value) };
}

fn parse_ado_style(raw: &str) -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::new();
    for part in raw.split(';') {
        let Some((k, v)) = part.split_once('=') else {
            continue;
        };
        let key = k.trim().to_ascii_lowercase();
        if !key.is_empty() {
            map.insert(key, v.trim().to_string());
        }
    }
    map
}

fn first_map<'a>(
    map: &'a std::collections::HashMap<String, String>,
    keys: &[&str],
) -> Option<&'a str> {
    keys.iter()
        .find_map(|k| map.get(*k).map(|s| s.as_str()))
}

fn looks_like_mssql(map: &std::collections::HashMap<String, String>) -> bool {
    map.contains_key("data source")
        || map.contains_key("initial catalog")
        || map.contains_key("user id")
}

fn split_host_port(host: &str) -> (String, Option<String>) {
    let mut h = host.trim().to_string();
    if h.to_ascii_lowercase().starts_with("tcp:") {
        h = h[4..].to_string();
    }
    if let Some((left, right)) = h.rsplit_once(',') {
        if right.chars().all(|c| c.is_ascii_digit()) {
            return (left.trim().to_string(), Some(right.trim().to_string()));
        }
    }
    if let Some((left, right)) = h.rsplit_once(':') {
        if !left.contains(':') && right.chars().all(|c| c.is_ascii_digit()) {
            return (left.trim().to_string(), Some(right.trim().to_string()));
        }
    }
    (h, None)
}

pub fn db_type() -> String {
    apply_connection_string_env_fallback();
    std::env::var("DB_TYPE")
        .or_else(|_| std::env::var("TYPEORM_TYPE"))
        .unwrap_or_else(|_| "mssql".into())
        .to_lowercase()
}

pub fn module_database_name() -> String {
    apply_connection_string_env_fallback();
    std::env::var("DB_DATABASE").unwrap_or_else(|_| "quickcode_template0_module".into())
}

fn env(key: &str, default: &str) -> String {
    apply_connection_string_env_fallback();
    std::env::var(key).unwrap_or_else(|_| default.into())
}

/// Tiberius config aligned with Nest `encrypt: false` / Java `encrypt=false`.
/// Default Tiberius+rustls is `EncryptionLevel::Required`, which fails against
/// self-hosted SQL Server (e.g. `db-mssql.quickcode.net`) and aborts before listen
/// → Cloud Run reports PORT not ready.
pub fn mssql_tiberius_config(database: &str) -> Config {
    apply_connection_string_env_fallback();
    let mut config = Config::new();
    config.host(env("DB_HOST", "localhost"));
    config.port(env("DB_PORT", "1433").parse().unwrap_or(1433));
    config.authentication(AuthMethod::sql_server(
        env("DB_USERNAME", "sa"),
        env("DB_PASSWORD", "Pass@word"),
    ));
    config.database(database);
    config.encryption(EncryptionLevel::NotSupported);
    config.trust_cert();
    config
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
