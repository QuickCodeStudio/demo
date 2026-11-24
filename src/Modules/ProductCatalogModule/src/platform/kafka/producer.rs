//! Nest `KafkaProducerService` parity — no-op when `KAFKA_BOOTSTRAP_SERVERS` empty.
//! Prefers native broker produce via `rskafka`; optional `KAFKA_REST_PROXY` fallback.

use once_cell::sync::OnceCell;
use rskafka::client::partition::{Compression, UnknownTopicHandling};
use rskafka::client::ClientBuilder;
use rskafka::record::Record;
use std::collections::BTreeMap;
use std::sync::Arc;
use chrono::Utc;
use tracing::{debug, error, info, warn};

use super::redactor::redact_sensitive;

static BOOTSTRAP: OnceCell<String> = OnceCell::new();
static CLIENT: OnceCell<Arc<rskafka::client::Client>> = OnceCell::new();

/// Lightweight Kafka publish: when `KAFKA_BOOTSTRAP_SERVERS` is set, connect once.
pub fn start_kafka_publisher() {
    // Outbox drain loop (C# `OutboxDispatcherHostedService`); produce_async is a no-op when Kafka is unconfigured.
    super::outbox::start_outbox_dispatcher();
    let servers = std::env::var("KAFKA_BOOTSTRAP_SERVERS")
        .or_else(|_| std::env::var("Kafka__BootstrapServers"))
        .unwrap_or_default();
    let servers = servers.trim().to_string();
    if servers.is_empty() {
        warn!("Kafka producer: BootstrapServers is not configured");
        return;
    }
    let _ = BOOTSTRAP.set(servers.clone());
    let module = std::env::var("MODULE_NAME").unwrap_or_else(|_| "Template0ModuleName".into());
    info!("Kafka producer initialized. BootstrapServers={servers} clientId={module}");
    // Eager connect in background so first publish is warm.
    tokio::spawn(async move {
        if let Err(e) = ensure_client().await {
            error!("Kafka producer connect failed: {e:#}");
        }
    });
}

async fn ensure_client() -> anyhow::Result<Arc<rskafka::client::Client>> {
    if let Some(c) = CLIENT.get() {
        return Ok(c.clone());
    }
    let servers = BOOTSTRAP
        .get()
        .cloned()
        .or_else(|| {
            std::env::var("KAFKA_BOOTSTRAP_SERVERS")
                .ok()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
        })
        .ok_or_else(|| anyhow::anyhow!("KAFKA_BOOTSTRAP_SERVERS unset"))?;
    let brokers: Vec<_> = servers
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    if brokers.is_empty() {
        anyhow::bail!("KAFKA_BOOTSTRAP_SERVERS empty");
    }
    let client = ClientBuilder::new(brokers)
        .build()
        .await
        .map_err(|e| anyhow::anyhow!("rskafka ClientBuilder: {e}"))?;
    let arc = Arc::new(client);
    let _ = CLIENT.set(arc.clone());
    Ok(arc)
}

pub async fn publish_json(topic: &str, payload: serde_json::Value) {
    let key = format!("json|{}|{}", topic, Utc::now().timestamp_millis());
    let body = redact_sensitive(payload);
    let message = body.to_string();
    if let Err(e) = produce_async(topic, &key, &message).await {
        warn!("Kafka publish_json failed topic={topic}: {e:#}");
    }
}

pub async fn produce_async(topic: &str, key: &str, message: &str) -> anyhow::Result<()> {
    let servers = BOOTSTRAP.get().cloned().unwrap_or_default();
    if servers.is_empty()
        && std::env::var("KAFKA_BOOTSTRAP_SERVERS")
            .unwrap_or_default()
            .trim()
            .is_empty()
    {
        return Ok(());
    }

    if let Ok(proxy) = std::env::var("KAFKA_REST_PROXY") {
        let proxy = proxy.trim();
        if !proxy.is_empty() {
            return produce_via_rest(proxy, topic, key, message).await;
        }
    }

    let client = ensure_client().await?;
    let controller = client
        .controller_client()
        .map_err(|e| anyhow::anyhow!("controller_client: {e}"))?;
    // Ensure topic exists (dev/demo) — ignore errors if already present / ACL.
    let _ = controller.create_topic(topic, 1, 1, 5_000).await;

    let partition_client = client
        .partition_client(topic.to_string(), 0, UnknownTopicHandling::Retry)
        .await
        .map_err(|e| anyhow::anyhow!("partition_client: {e}"))?;

    let record = Record {
        key: Some(key.as_bytes().to_vec()),
        value: Some(message.as_bytes().to_vec()),
        headers: BTreeMap::new(),
        timestamp: Utc::now(),
    };
    partition_client
        .produce(vec![record], Compression::NoCompression)
        .await
        .map_err(|e| anyhow::anyhow!("produce: {e}"))?;
    debug!("Kafka message delivered. Topic={topic} Key={key}");
    Ok(())
}

async fn produce_via_rest(proxy: &str, topic: &str, key: &str, message: &str) -> anyhow::Result<()> {
    let url = format!("{}/topics/{}", proxy.trim_end_matches('/'), topic);
    let client = reqwest::Client::new();
    let value: serde_json::Value =
        serde_json::from_str(message).unwrap_or_else(|_| serde_json::json!({ "raw": message }));
    let payload = serde_json::json!({
        "records": [{ "key": key, "value": value }]
    });
    let res = crate::platform::http::fetch_with_retry(
        || {
            client
                .post(&url)
                .header("Content-Type", "application/vnd.kafka.json.v2+json")
                .json(&payload)
        },
        3,
        500,
    )
    .await?;
    if !res.status().is_success() {
        anyhow::bail!("Kafka REST status={}", res.status());
    }
    debug!("Kafka REST publish ok topic={topic}");
    Ok(())
}
