//! Process-local saga state store — C# `InMemorySagaStateStore` / `ISagaStateStore` parity.
//! Swap for a durable implementation when multi-instance durability is required.

use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::sync::Mutex;

/// Upper bound on retained records (the C# store grows unbounded; a long-lived Rust API process must not).
/// When reached, the oldest non-running record is evicted on `start`.
const MAX_RETAINED_RECORDS: usize = 10_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SagaStatus {
    Running,
    Completed,
    Compensating,
    Compensated,
    Failed,
}

#[derive(Debug, Clone)]
pub struct SagaStateRecord {
    pub saga_id: String,
    pub workflow_name: String,
    pub kind: String,
    pub correlation_id: Option<String>,
    pub status: SagaStatus,
    pub completed_steps: Vec<String>,
    pub compensated_steps: Vec<String>,
    pub last_error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl SagaStateRecord {
    pub fn new(
        saga_id: impl Into<String>,
        workflow_name: impl Into<String>,
        kind: impl Into<String>,
        correlation_id: Option<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            saga_id: saga_id.into(),
            workflow_name: workflow_name.into(),
            kind: kind.into(),
            correlation_id,
            status: SagaStatus::Running,
            completed_steps: Vec::new(),
            compensated_steps: Vec::new(),
            last_error: None,
            created_at: now,
            updated_at: now,
        }
    }
}

#[derive(Debug, Default)]
pub struct InMemorySagaStateStore {
    items: Mutex<HashMap<String, SagaStateRecord>>,
}

impl InMemorySagaStateStore {
    pub fn new() -> Self {
        Self::default()
    }

    fn items(&self) -> std::sync::MutexGuard<'_, HashMap<String, SagaStateRecord>> {
        self.items.lock().unwrap_or_else(|e| e.into_inner())
    }

    pub fn start(&self, record: SagaStateRecord) {
        let mut items = self.items();
        if items.len() >= MAX_RETAINED_RECORDS && !items.contains_key(&record.saga_id) {
            let oldest = items
                .values()
                .filter(|r| r.status != SagaStatus::Running)
                .min_by_key(|r| r.created_at)
                .map(|r| r.saga_id.clone());
            if let Some(id) = oldest {
                items.remove(&id);
            }
        }
        items.insert(record.saga_id.clone(), record);
    }

    pub fn mark_step_completed(&self, saga_id: &str, step_name: &str) {
        if let Some(record) = self.items().get_mut(saga_id) {
            if !record
                .completed_steps
                .iter()
                .any(|s| s.eq_ignore_ascii_case(step_name))
            {
                record.completed_steps.push(step_name.to_string());
            }
            record.updated_at = Utc::now();
        }
    }

    pub fn mark_compensating(&self, saga_id: &str) {
        if let Some(record) = self.items().get_mut(saga_id) {
            record.status = SagaStatus::Compensating;
            record.updated_at = Utc::now();
        }
    }

    pub fn mark_step_compensated(&self, saga_id: &str, step_name: &str) {
        if let Some(record) = self.items().get_mut(saga_id) {
            if !record
                .compensated_steps
                .iter()
                .any(|s| s.eq_ignore_ascii_case(step_name))
            {
                record.compensated_steps.push(step_name.to_string());
            }
            record.updated_at = Utc::now();
        }
    }

    pub fn complete(&self, saga_id: &str, status: SagaStatus, error: Option<String>) {
        if let Some(record) = self.items().get_mut(saga_id) {
            record.status = status;
            record.last_error = error;
            record.updated_at = Utc::now();
        }
    }

    pub fn get(&self, saga_id: &str) -> Option<SagaStateRecord> {
        self.items().get(saga_id).cloned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lifecycle_tracks_steps_and_status() {
        let store = InMemorySagaStateStore::new();
        store.start(SagaStateRecord::new("s1", "wf", "endpoint", Some("c1".into())));
        assert_eq!(store.get("s1").unwrap().status, SagaStatus::Running);

        store.mark_step_completed("s1", "reserve");
        store.mark_step_completed("s1", "RESERVE"); // case-insensitive de-dupe
        store.mark_step_completed("s1", "charge");
        store.mark_compensating("s1");
        assert_eq!(store.get("s1").unwrap().status, SagaStatus::Compensating);

        store.mark_step_compensated("s1", "refund");
        store.mark_step_compensated("s1", "refund");
        store.complete("s1", SagaStatus::Compensated, Some("boom".into()));

        let rec = store.get("s1").unwrap();
        assert_eq!(rec.status, SagaStatus::Compensated);
        assert_eq!(rec.completed_steps, ["reserve", "charge"]);
        assert_eq!(rec.compensated_steps, ["refund"]);
        assert_eq!(rec.last_error.as_deref(), Some("boom"));
        assert_eq!(rec.correlation_id.as_deref(), Some("c1"));
    }

    #[test]
    fn unknown_saga_is_noop() {
        let store = InMemorySagaStateStore::new();
        store.mark_step_completed("nope", "a");
        store.mark_compensating("nope");
        store.complete("nope", SagaStatus::Failed, None);
        assert!(store.get("nope").is_none());
    }
}
