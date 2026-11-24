//! Process-local idempotency store — C# `InMemoryIdempotencyStore` / `IIdempotencyStore` parity.
//! Swap for a durable implementation when multi-instance durability is required.

use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::sync::Mutex;

/// Upper bound on retained records (the C# store grows unbounded; a long-lived Rust API process must not).
/// When reached, the oldest record is evicted on `save` of a new key.
const MAX_RETAINED_RECORDS: usize = 10_000;

#[derive(Debug, Clone)]
pub struct IdempotencyRecord {
    pub key: String,
    pub status_code: u16,
    pub body: String,
    pub correlation_id: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl IdempotencyRecord {
    pub fn new(
        key: impl Into<String>,
        status_code: u16,
        body: impl Into<String>,
        correlation_id: Option<String>,
    ) -> Self {
        Self {
            key: key.into(),
            status_code,
            body: body.into(),
            correlation_id,
            created_at: Utc::now(),
        }
    }
}

#[derive(Debug, Default)]
pub struct InMemoryIdempotencyStore {
    items: Mutex<HashMap<String, IdempotencyRecord>>,
}

impl InMemoryIdempotencyStore {
    pub fn new() -> Self {
        Self::default()
    }

    fn items(&self) -> std::sync::MutexGuard<'_, HashMap<String, IdempotencyRecord>> {
        self.items.lock().unwrap_or_else(|e| e.into_inner())
    }

    pub fn try_get(&self, key: &str) -> Option<IdempotencyRecord> {
        self.items().get(key).cloned()
    }

    pub fn save(&self, record: IdempotencyRecord) {
        let mut items = self.items();
        if items.len() >= MAX_RETAINED_RECORDS && !items.contains_key(&record.key) {
            let oldest = items
                .values()
                .min_by_key(|r| r.created_at)
                .map(|r| r.key.clone());
            if let Some(key) = oldest {
                items.remove(&key);
            }
        }
        items.insert(record.key.clone(), record);
    }

    pub fn len(&self) -> usize {
        self.items().len()
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn save_then_get_round_trips_and_overwrites() {
        let store = InMemoryIdempotencyStore::new();
        assert!(store.try_get("k").is_none());
        store.save(IdempotencyRecord::new("k", 200, "{\"a\":1}", Some("c1".into())));
        let rec = store.try_get("k").unwrap();
        assert_eq!(rec.status_code, 200);
        assert_eq!(rec.body, "{\"a\":1}");
        assert_eq!(rec.correlation_id.as_deref(), Some("c1"));

        store.save(IdempotencyRecord::new("k", 502, "{}", None));
        assert_eq!(store.try_get("k").unwrap().status_code, 502);
        assert_eq!(store.len(), 1);
    }

    #[test]
    fn evicts_oldest_when_full() {
        let store = InMemoryIdempotencyStore::new();
        for i in 0..MAX_RETAINED_RECORDS {
            let mut r = IdempotencyRecord::new(format!("k{i}"), 200, "{}", None);
            r.created_at = Utc::now() - chrono::Duration::seconds((MAX_RETAINED_RECORDS - i) as i64);
            store.save(r);
        }
        store.save(IdempotencyRecord::new("new", 200, "{}", None));
        assert_eq!(store.len(), MAX_RETAINED_RECORDS);
        assert!(store.try_get("k0").is_none());
        assert!(store.try_get("new").is_some());
    }
}
