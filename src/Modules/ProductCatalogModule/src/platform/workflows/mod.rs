//! Endpoint workflow runtime (HTTP steps, foreach, parallel, compensate, repeat, in-memory saga + Idempotency-Key replay) — Nest `platform/workflows` / C# `ModuleEndpointWorkflowMiddleware` parity.
//! Loads `workflows/generated-endpoint-workflows.json` (or `ENDPOINT_WORKFLOWS_PATH`) at startup.

mod executor;
mod idempotency;
mod middleware;
mod registry;
mod saga;
mod types;

use std::sync::Arc;

pub use executor::{parse_workflow, EndpointWorkflowExecutor};
pub use idempotency::{IdempotencyRecord, InMemoryIdempotencyStore};
pub use middleware::{endpoint_workflows, endpoint_workflows_runtime, should_skip};
pub use registry::{normalize_workflow_path, EndpointWorkflowMatch, EndpointWorkflowRegistry};
pub use saga::{InMemorySagaStateStore, SagaStateRecord, SagaStatus};
pub use types::{
    EndpointWorkflowEntry, EndpointWorkflowExecutionResult, WorkflowDefinition, WorkflowStep,
    ENDPOINT_WORKFLOW_DEFAULT_PATH,
};

/// Registry + executor + idempotency store held in `AppState` (loaded once at startup).
pub struct EndpointWorkflowRuntime {
    pub registry: EndpointWorkflowRegistry,
    pub executor: EndpointWorkflowExecutor,
    /// `Idempotency-Key` replay cache (C# `IIdempotencyStore`), shared by the endpoint middleware.
    pub idempotency: Arc<InMemoryIdempotencyStore>,
}

impl EndpointWorkflowRuntime {
    pub fn load() -> Self {
        Self {
            registry: EndpointWorkflowRegistry::load_from_env(),
            executor: EndpointWorkflowExecutor::new(),
            idempotency: Arc::new(InMemoryIdempotencyStore::new()),
        }
    }

    pub fn with_registry(registry: EndpointWorkflowRegistry) -> Self {
        Self {
            registry,
            executor: EndpointWorkflowExecutor::new(),
            idempotency: Arc::new(InMemoryIdempotencyStore::new()),
        }
    }
}
