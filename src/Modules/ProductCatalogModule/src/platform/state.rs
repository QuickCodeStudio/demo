use crate::auditing::AuditWriterHandle;
use crate::db::DbPool;
use crate::platform::workflows::EndpointWorkflowRuntime;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub pool: DbPool,
    pub audit: Option<AuditWriterHandle>,
    /// Endpoint workflow registry + executor (loaded once at startup).
    pub workflows: Arc<EndpointWorkflowRuntime>,
}

impl AppState {
    pub fn new(pool: DbPool) -> Self {
        let audit = Some(crate::auditing::start_audit_writer(pool.clone()));
        let workflows = Arc::new(EndpointWorkflowRuntime::load());
        Self { pool, audit, workflows }
    }
}
