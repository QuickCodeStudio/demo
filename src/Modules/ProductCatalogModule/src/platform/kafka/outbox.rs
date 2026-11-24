//! Process-local Kafka outbox + dispatcher — C# `InMemoryOutboxStore` / `OutboxDispatcherHostedService` parity.
//! `kafka_publish` enqueues; a background loop drains pending messages through `produce_async`.
//! Swap for a durable (SQL) store when multi-instance durability is required.

use chrono::{DateTime, Utc};
use once_cell::sync::{Lazy, OnceCell};
use std::collections::HashMap;
use std::future::Future;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::task::JoinHandle;
use tracing::{error, info};
use uuid::Uuid;

use super::producer::produce_async;

/// Messages drained per poll (C# `DequeuePendingAsync(20)`).
pub const OUTBOX_BATCH_SIZE: usize = 20;
const DEFAULT_POLL_SECONDS: u64 = 2;
/// Upper bound on retained *sent* records (the C# store grows unbounded; a long-lived Rust process must not).
/// Pending messages are never evicted.
const MAX_RETAINED_SENT: usize = 10_000;

#[derive(Debug, Clone)]
pub struct OutboxMessage {
    pub id: Uuid,
    pub topic: String,
    pub key: String,
    pub payload: String,
    pub correlation_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub sent_at: Option<DateTime<Utc>>,
    pub attempt_count: u32,
    pub last_error: Option<String>,
}

impl OutboxMessage {
    pub fn new(
        topic: impl Into<String>,
        key: impl Into<String>,
        payload: impl Into<String>,
        correlation_id: Option<String>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            topic: topic.into(),
            key: key.into(),
            payload: payload.into(),
            correlation_id,
            created_at: Utc::now(),
            sent_at: None,
            attempt_count: 0,
            last_error: None,
        }
    }
}

#[derive(Debug, Default)]
pub struct InMemoryOutboxStore {
    items: Mutex<HashMap<Uuid, OutboxMessage>>,
}

impl InMemoryOutboxStore {
    pub fn new() -> Self {
        Self::default()
    }

    fn items(&self) -> std::sync::MutexGuard<'_, HashMap<Uuid, OutboxMessage>> {
        self.items.lock().unwrap_or_else(|e| e.into_inner())
    }

    pub fn enqueue(&self, message: OutboxMessage) {
        let mut items = self.items();
        if items.len() >= MAX_RETAINED_SENT {
            let oldest_sent = items
                .values()
                .filter(|m| m.sent_at.is_some())
                .min_by_key(|m| m.sent_at)
                .map(|m| m.id);
            if let Some(id) = oldest_sent {
                items.remove(&id);
            }
        }
        items.insert(message.id, message);
    }

    /// Oldest-first pending (unsent) messages, at most `take` (min 1).
    pub fn dequeue_pending(&self, take: usize) -> Vec<OutboxMessage> {
        let mut pending: Vec<OutboxMessage> = self
            .items()
            .values()
            .filter(|m| m.sent_at.is_none())
            .cloned()
            .collect();
        pending.sort_by_key(|m| m.created_at);
        pending.truncate(take.max(1));
        pending
    }

    pub fn mark_sent(&self, id: Uuid) {
        if let Some(m) = self.items().get_mut(&id) {
            m.sent_at = Some(Utc::now());
            m.last_error = None;
        }
    }

    pub fn mark_failed(&self, id: Uuid, error: impl Into<String>) {
        if let Some(m) = self.items().get_mut(&id) {
            m.attempt_count += 1;
            m.last_error = Some(error.into());
        }
    }

    pub fn get(&self, id: Uuid) -> Option<OutboxMessage> {
        self.items().get(&id).cloned()
    }

    pub fn pending_count(&self) -> usize {
        self.items().values().filter(|m| m.sent_at.is_none()).count()
    }
}

static GLOBAL_STORE: Lazy<Arc<InMemoryOutboxStore>> = Lazy::new(|| Arc::new(InMemoryOutboxStore::new()));
static DISPATCHER_STARTED: OnceCell<()> = OnceCell::new();

/// Shared process-wide outbox used by `kafka_publish` and the default dispatcher.
pub fn global_outbox() -> Arc<InMemoryOutboxStore> {
    GLOBAL_STORE.clone()
}

/// `KAFKA_OUTBOX_POLL_SECONDS` / `Kafka__OutboxPollSeconds` (default 2, min 1).
pub fn outbox_poll_interval() -> Duration {
    let secs = std::env::var("KAFKA_OUTBOX_POLL_SECONDS")
        .or_else(|_| std::env::var("Kafka__OutboxPollSeconds"))
        .ok()
        .and_then(|v| v.trim().parse::<u64>().ok())
        .unwrap_or(DEFAULT_POLL_SECONDS)
        .max(1);
    Duration::from_secs(secs)
}

/// Drains one batch: produce each pending message, then mark sent / failed. Returns the number sent.
pub async fn drain_once<F, Fut>(store: &InMemoryOutboxStore, produce: &F) -> usize
where
    F: Fn(String, String, String) -> Fut,
    Fut: Future<Output = anyhow::Result<()>>,
{
    let mut sent = 0;
    for message in store.dequeue_pending(OUTBOX_BATCH_SIZE) {
        match produce(message.topic.clone(), message.key.clone(), message.payload.clone()).await {
            Ok(()) => {
                store.mark_sent(message.id);
                sent += 1;
                info!(
                    "Outbox sent. Id={} Topic={} CorrelationId={}",
                    message.id,
                    message.topic,
                    message.correlation_id.as_deref().unwrap_or("")
                );
            }
            Err(e) => {
                store.mark_failed(message.id, format!("{e:#}"));
                error!("Outbox produce failed. Id={} Topic={}: {e:#}", message.id, message.topic);
            }
        }
    }
    sent
}

/// Spawns a poll loop with a custom producer (used by tests; `start_outbox_dispatcher` uses `produce_async`).
pub fn spawn_dispatcher_with<F, Fut>(
    store: Arc<InMemoryOutboxStore>,
    interval: Duration,
    produce: F,
) -> JoinHandle<()>
where
    F: Fn(String, String, String) -> Fut + Send + Sync + 'static,
    Fut: Future<Output = anyhow::Result<()>> + Send + 'static,
{
    tokio::spawn(async move {
        loop {
            drain_once(&store, &produce).await;
            tokio::time::sleep(interval).await;
        }
    })
}

/// Starts the global dispatcher once per process (idempotent). Requires a running tokio runtime.
pub fn start_outbox_dispatcher() {
    if DISPATCHER_STARTED.set(()).is_err() {
        return;
    }
    let interval = outbox_poll_interval();
    info!("Kafka outbox dispatcher started. PollSeconds={}", interval.as_secs());
    spawn_dispatcher_with(global_outbox(), interval, |topic, key, payload| async move {
        produce_async(&topic, &key, &payload).await
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    #[test]
    fn dequeue_is_oldest_first_and_skips_sent() {
        let store = InMemoryOutboxStore::new();
        let mut a = OutboxMessage::new("t", "k1", "p1", None);
        a.created_at = Utc::now() - chrono::Duration::seconds(10);
        let b = OutboxMessage::new("t", "k2", "p2", None);
        let (a_id, b_id) = (a.id, b.id);
        store.enqueue(b);
        store.enqueue(a);

        let pending = store.dequeue_pending(10);
        assert_eq!(pending.iter().map(|m| m.id).collect::<Vec<_>>(), [a_id, b_id]);
        assert_eq!(store.dequeue_pending(1).len(), 1);
        assert_eq!(store.dequeue_pending(0).len(), 1, "take is clamped to >= 1");

        store.mark_sent(a_id);
        assert_eq!(store.pending_count(), 1);
        assert!(store.get(a_id).unwrap().sent_at.is_some());
    }

    #[test]
    fn mark_failed_increments_attempts_and_mark_sent_clears_error() {
        let store = InMemoryOutboxStore::new();
        let m = OutboxMessage::new("t", "k", "p", Some("c1".into()));
        let id = m.id;
        store.enqueue(m);
        store.mark_failed(id, "boom");
        store.mark_failed(id, "boom2");
        let rec = store.get(id).unwrap();
        assert_eq!(rec.attempt_count, 2);
        assert_eq!(rec.last_error.as_deref(), Some("boom2"));
        assert!(rec.sent_at.is_none());

        store.mark_sent(id);
        let rec = store.get(id).unwrap();
        assert!(rec.last_error.is_none());
        assert!(rec.sent_at.is_some());
        store.mark_sent(Uuid::new_v4()); // unknown id is a no-op
    }

    #[tokio::test]
    async fn drain_once_marks_sent_and_retries_failures() {
        let store = InMemoryOutboxStore::new();
        let ok = OutboxMessage::new("orders", "k-ok", "{\"a\":1}", Some("c1".into()));
        let bad = OutboxMessage::new("orders", "k-bad", "{\"b\":2}", None);
        let (ok_id, bad_id) = (ok.id, bad.id);
        store.enqueue(ok);
        store.enqueue(bad);

        let calls = Arc::new(AtomicUsize::new(0));
        let c = calls.clone();
        let produce = move |_topic: String, key: String, _payload: String| {
            let c = c.clone();
            async move {
                c.fetch_add(1, Ordering::SeqCst);
                if key == "k-bad" {
                    anyhow::bail!("broker down");
                }
                Ok(())
            }
        };

        assert_eq!(drain_once(&store, &produce).await, 1);
        assert!(store.get(ok_id).unwrap().sent_at.is_some());
        let bad_rec = store.get(bad_id).unwrap();
        assert!(bad_rec.sent_at.is_none());
        assert_eq!(bad_rec.attempt_count, 1);
        assert!(bad_rec.last_error.unwrap().contains("broker down"));

        // Second pass retries only the failed one.
        assert_eq!(drain_once(&store, &produce).await, 0);
        assert_eq!(calls.load(Ordering::SeqCst), 3);
        assert_eq!(store.get(bad_id).unwrap().attempt_count, 2);
    }

    #[tokio::test]
    async fn dispatcher_loop_drains_enqueued_messages() {
        let store = Arc::new(InMemoryOutboxStore::new());
        let seen: Arc<Mutex<Vec<(String, String, String)>>> = Arc::default();
        let seen2 = seen.clone();
        let handle = spawn_dispatcher_with(store.clone(), Duration::from_millis(10), move |t, k, p| {
            let seen = seen2.clone();
            async move {
                seen.lock().unwrap().push((t, k, p));
                Ok(())
            }
        });

        let m = OutboxMessage::new("topic-a", "key-a", "payload-a", Some("corr".into()));
        let id = m.id;
        store.enqueue(m);

        for _ in 0..200 {
            if store.get(id).unwrap().sent_at.is_some() {
                break;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
        handle.abort();

        assert!(store.get(id).unwrap().sent_at.is_some(), "dispatcher should mark message sent");
        assert_eq!(store.pending_count(), 0);
        assert_eq!(
            *seen.lock().unwrap(),
            [("topic-a".to_string(), "key-a".to_string(), "payload-a".to_string())]
        );
    }

    #[test]
    fn poll_interval_reads_env_with_default_and_floor() {
        // Single test mutates these env vars to avoid cross-test races.
        std::env::remove_var("KAFKA_OUTBOX_POLL_SECONDS");
        std::env::remove_var("Kafka__OutboxPollSeconds");
        assert_eq!(outbox_poll_interval(), Duration::from_secs(2));
        std::env::set_var("Kafka__OutboxPollSeconds", "5");
        assert_eq!(outbox_poll_interval(), Duration::from_secs(5));
        std::env::set_var("KAFKA_OUTBOX_POLL_SECONDS", "0");
        assert_eq!(outbox_poll_interval(), Duration::from_secs(1));
        std::env::set_var("KAFKA_OUTBOX_POLL_SECONDS", "junk");
        assert_eq!(outbox_poll_interval(), Duration::from_secs(2));
        std::env::remove_var("KAFKA_OUTBOX_POLL_SECONDS");
        std::env::remove_var("Kafka__OutboxPollSeconds");
    }
}
