//! Shared DB harness for generated `*_service_test.rs` (D18 / Nest repository.spec parity).
//! Enable with `QUICKCODE_DB_TESTS=1` and the same `DB_*` env as the API container.

use quickcode_module::db::{create_pool, execute_sql_script, DbPool};
use std::collections::HashMap;

/// Connect when integration tests are opted in; otherwise `None` (tests skip softly).
/// MSSQL pools are lazy — probe with `SELECT 1` so a down broker skips instead of panicking.
pub async fn try_connect() -> Option<DbPool> {
    if !db_tests_enabled() {
        eprintln!("skip DB integration: set QUICKCODE_DB_TESTS=1 (and DB_* env)");
        return None;
    }
    let pool = match create_pool().await {
        Ok(pool) => pool,
        Err(e) => {
            eprintln!("skip DB integration: pool connect failed: {e:#}");
            return None;
        }
    };
    match execute_sql_script(&pool, "SELECT 1 AS ok", &HashMap::new()).await {
        Ok(_) => Some(pool),
        Err(e) => {
            eprintln!("skip DB integration: probe failed: {e:#}");
            None
        }
    }
}

pub fn db_tests_enabled() -> bool {
    matches!(
        std::env::var("QUICKCODE_DB_TESTS")
            .unwrap_or_default()
            .to_lowercase()
            .as_str(),
        "1" | "true" | "yes"
    )
}
