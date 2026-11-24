use anyhow::{bail, Context, Result};
use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

static CACHE: Lazy<Mutex<HashMap<String, String>>> = Lazy::new(|| Mutex::new(HashMap::new()));

fn strip_bom(text: &str) -> &str {
    text.strip_prefix('\u{feff}').unwrap_or(text)
}

/// Module root = next to binary (Docker) or Cargo package root (dev).
fn resolve_sql_root() -> PathBuf {
    if let Ok(explicit) = std::env::var("QUICKCODE_SQL_ROOT") {
        return PathBuf::from(explicit);
    }
    let candidates = [
        PathBuf::from("sql"),
        PathBuf::from("/app/sql"),
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("sql"),
    ];
    for c in candidates {
        if c.exists() {
            return c;
        }
    }
    PathBuf::from("sql")
}

/// Load QuickCode Query/Command/Crud script — same files C# embeds via SqlLoader.
/// File: sql/{ClassName}/{Query|Command|Crud}/{ClassName}.{ScriptName}.g.sql
pub fn load_sql(class_name: &str, kind: &str, script_name: &str) -> Result<String> {
    let key = format!("{class_name}/{kind}/{script_name}");
    if let Some(hit) = CACHE.lock().unwrap().get(&key) {
        return Ok(hit.clone());
    }

    let file_name = format!("{class_name}.{script_name}.g.sql");
    let full = resolve_sql_root().join(class_name).join(kind).join(file_name);
    if !full.exists() {
        bail!("QuickCode SQL script not found: {}", full.display());
    }
    let raw = fs::read_to_string(&full).with_context(|| format!("read {}", full.display()))?;
    let sql = strip_bom(&raw).to_string();
    CACHE.lock().unwrap().insert(key, sql.clone());
    Ok(sql)
}

fn lookup_named<'a>(named: &'a HashMap<String, serde_json::Value>, token: &str) -> Option<&'a serde_json::Value> {
    if let Some(v) = named.get(token) {
        return Some(v);
    }
    let at = format!("@{token}");
    if let Some(v) = named.get(&at) {
        return Some(v);
    }
    let upper = token.to_uppercase();
    for (k, v) in named {
        let bare = k.trim_start_matches('@').to_uppercase();
        if bare == upper {
            return Some(v);
        }
    }
    None
}

/// Bind @Named parameters (Dapper-style) by name — Nest bindNamedParamsMap parity.
pub fn bind_named_params_map(
    sql: &str,
    named: &HashMap<String, serde_json::Value>,
    db_type: &str,
) -> (String, Vec<serde_json::Value>) {
    static RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"@([A-Za-z_][A-Za-z0-9_]*)").unwrap());
    let mut params = Vec::new();
    let text = RE.replace_all(sql, |caps: &regex::Captures| {
        let name = &caps[1];
        if name.chars().all(|c| c.is_ascii_digit()) {
            return caps[0].to_string();
        }
        params.push(
            lookup_named(named, name)
                .cloned()
                .unwrap_or(serde_json::Value::Null),
        );
        match db_type {
            "postgresql" | "postgres" => format!("${}", params.len()),
            "mysql" => "?".to_string(),
            _ => format!("@P{}", params.len()),
        }
    });
    (text.into_owned(), params)
}

#[allow(dead_code)]
pub fn resolve_migrations_root() -> PathBuf {
    if let Ok(explicit) = std::env::var("QUICKCODE_MIGRATIONS_ROOT") {
        return PathBuf::from(explicit);
    }
    for c in [
        PathBuf::from("migrations"),
        PathBuf::from("/app/migrations"),
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("migrations"),
    ] {
        if c.exists() {
            return c;
        }
    }
    PathBuf::from("migrations")
}

pub fn list_sql_files(dir: &Path) -> Result<Vec<PathBuf>> {
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut files: Vec<_> = fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            p.extension()
                .and_then(|x| x.to_str())
                .is_some_and(|ext| ext.eq_ignore_ascii_case("sql"))
        })
        .collect();
    files.sort();
    Ok(files)
}
