//! Nest `KafkaEventCatalogService` parity — Identity `get-kafka-events` with TTL cache.

use once_cell::sync::Lazy;
use serde::Deserialize;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tracing::{error, warn};

const TTL: Duration = Duration::from_secs(5 * 60);

#[derive(Debug, Clone)]
pub struct KafkaEventEntry {
    pub topic_name: String,
    pub url_path: String,
    pub http_method: String,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
struct CatalogRow {
    // Identity returns camelCase; older dumps may use PascalCase.
    #[serde(default, alias = "topicName", alias = "TopicName")]
    topic_name: String,
    #[serde(default, alias = "urlPath", alias = "UrlPath")]
    url_path: String,
    #[serde(default, alias = "httpMethod", alias = "HttpMethod")]
    http_method: String,
    #[serde(default, alias = "isActive", alias = "IsActive")]
    is_active: bool,
}

struct Cache {
    at: Instant,
    entries: Vec<KafkaEventEntry>,
}

static CACHE: Lazy<Mutex<Option<Cache>>> = Lazy::new(|| Mutex::new(None));

/// Match Nest: append `_{method}` to topic when a catalog row hits.
pub async fn find(http_method: &str, path: &str) -> Option<KafkaEventEntry> {
    if path.is_empty() {
        return None;
    }
    let entries = get_entries().await;
    let method = http_method.to_uppercase();
    for candidate in path_variants(path) {
        for e in &entries {
            if !e.is_active {
                continue;
            }
            if e.http_method.to_uppercase() != method {
                continue;
            }
            if path_matches(&e.url_path, &candidate) {
                return Some(KafkaEventEntry {
                    topic_name: format!("{}_{}", e.topic_name, method.to_lowercase()),
                    url_path: e.url_path.clone(),
                    http_method: e.http_method.clone(),
                    is_active: true,
                });
            }
        }
    }
    None
}

async fn get_entries() -> Vec<KafkaEventEntry> {
    if let Ok(guard) = CACHE.lock() {
        if let Some(c) = guard.as_ref() {
            if c.at.elapsed() < TTL {
                return c.entries.clone();
            }
        }
    }
    match load_events().await {
        Ok(entries) => {
            if let Ok(mut guard) = CACHE.lock() {
                *guard = Some(Cache {
                    at: Instant::now(),
                    entries: entries.clone(),
                });
            }
            entries
        }
        Err(e) => {
            error!("Failed to load Kafka event catalog: {e:#}");
            Vec::new()
        }
    }
}

async fn load_events() -> anyhow::Result<Vec<KafkaEventEntry>> {
    let base = std::env::var("IDENTITY_MODULE_API")
        .or_else(|_| std::env::var("QuickcodeClients__IdentityModuleApi"))
        .unwrap_or_default()
        .trim()
        .to_string();
    if base.is_empty() {
        warn!(
            "IDENTITY_MODULE_API / QuickcodeClients__IdentityModuleApi not configured; Kafka catalog is empty"
        );
        return Ok(Vec::new());
    }

    let Some(token) = resolve_catalog_bearer() else {
        warn!(
            "Kafka catalog auth missing: set GATEWAY_JWT_PRIVATE_KEY (preferred), or GATEWAY_SERVICE_BEARER / IDENTITY_SERVICE_BEARER"
        );
        return Ok(Vec::new());
    };

    let url = format!(
        "{}/api/identity-module/kafka-events/get-kafka-events",
        base.trim_end_matches('/')
    );
    let client = reqwest::Client::new();
    let res = crate::platform::http::fetch_with_retry(
        || {
            client
                .get(&url)
                .header("Authorization", format!("Bearer {token}"))
        },
        3,
        1000,
    )
    .await?;
    if !res.status().is_success() {
        anyhow::bail!("Kafka catalog HTTP {}", res.status());
    }
    let rows: Vec<CatalogRow> = res.json().await?;
    Ok(rows
        .into_iter()
        .map(|x| KafkaEventEntry {
            topic_name: x.topic_name,
            url_path: x.url_path,
            http_method: x.http_method,
            is_active: x.is_active,
        })
        .collect())
}

fn resolve_catalog_bearer() -> Option<String> {
    match crate::platform::http::mint_catalog_token("IdentityModule") {
        Ok(t) if !t.is_empty() => return Some(t),
        Ok(_) => warn!("mint_catalog_token returned empty token"),
        Err(e) => warn!("mint_catalog_token failed: {e:#}"),
    }
    for key in ["GATEWAY_SERVICE_BEARER", "IDENTITY_SERVICE_BEARER"] {
        if let Ok(v) = std::env::var(key) {
            let t = v.trim().to_string();
            if !t.is_empty() {
                return Some(t);
            }
        }
    }
    None
}

fn path_variants(path: &str) -> Vec<String> {
    let mut out = vec![path.to_string()];
    let trimmed = path.trim_end_matches('/');
    if trimmed != path && !trimmed.is_empty() {
        out.push(trimmed.to_string());
    }
    if let Some(stripped) = path.strip_prefix('/') {
        out.push(stripped.to_string());
    } else {
        out.push(format!("/{path}"));
    }
    out
}

fn path_matches(template: &str, path: &str) -> bool {
    let t = template.trim_end_matches('/').to_lowercase();
    let p = path.trim_end_matches('/').to_lowercase();
    if t == p {
        return true;
    }
    let t_parts: Vec<_> = t.split('/').filter(|s| !s.is_empty()).collect();
    let p_parts: Vec<_> = p.split('/').filter(|s| !s.is_empty()).collect();
    if t_parts.len() != p_parts.len() {
        return false;
    }
    for (tp, pp) in t_parts.iter().zip(p_parts.iter()) {
        if tp.starts_with('{') && tp.ends_with('}') {
            continue;
        }
        if tp != pp {
            return false;
        }
    }
    true
}
