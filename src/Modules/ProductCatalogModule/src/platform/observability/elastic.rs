use serde_json::{Map, Value};
use tracing::debug;

/// Nest elastic-sink parity — fire-and-forget when Elastic URI configured.
pub fn write_elastic_log(fields: Map<String, Value>) {
    let uri = std::env::var("ELASTIC_URI")
        .or_else(|_| std::env::var("ElasticSearch__Uri"))
        .unwrap_or_default();
    if uri.trim().is_empty() {
        return;
    }
    let index = std::env::var("ELASTIC_INDEX").unwrap_or_else(|_| "quickcode-logs".into());
    let url = format!("{}/{}/_doc", uri.trim_end_matches('/'), index);
    let mut body = fields;
    body.entry("service".to_string()).or_insert_with(|| {
        Value::String(
            std::env::var("MODULE_NAME").unwrap_or_else(|_| "Template0ModuleName".into()),
        )
    });
    body.insert(
        "@timestamp".into(),
        Value::String(chrono::Utc::now().to_rfc3339()),
    );
    tokio::spawn(async move {
        let client = reqwest::Client::new();
        match client.post(&url).json(&body).send().await {
            Ok(res) => debug!("Elastic sink status={}", res.status()),
            Err(e) => debug!("Elastic sink error: {e}"),
        }
    });
}
