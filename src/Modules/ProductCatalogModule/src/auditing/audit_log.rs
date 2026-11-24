use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Nest / C# AuditLogPayload parity for AUDIT_LOGS inserts.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogPayload {
    pub id: String,
    pub entity_name: String,
    pub entity_id: String,
    pub action: String,
    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub user_group: Option<String>,
    pub timestamp: String,
    pub duration_ms: Option<i64>,
    pub status_code: Option<i32>,
    pub request_module: Option<String>,
    pub request_path: Option<String>,
    pub old_values: Option<String>,
    pub new_values: Option<String>,
    pub changed_columns: Option<String>,
    pub is_changed: bool,
    pub change_summary: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub client_id: Option<String>,
    pub correlation_id: Option<String>,
    pub is_success: bool,
    pub error_message: Option<String>,
    pub hash: Option<String>,
}

pub fn create_audit_log(
    entity_name: impl Into<String>,
    entity_id: impl Into<String>,
    action: impl Into<String>,
) -> AuditLogPayload {
    AuditLogPayload {
        id: Uuid::new_v4().to_string(),
        entity_name: entity_name.into(),
        entity_id: entity_id.into(),
        action: action.into(),
        user_id: None,
        user_name: None,
        user_group: None,
        timestamp: chrono::Utc::now().to_rfc3339(),
        duration_ms: None,
        status_code: None,
        request_module: None,
        request_path: None,
        old_values: None,
        new_values: None,
        changed_columns: None,
        is_changed: false,
        change_summary: None,
        ip_address: None,
        user_agent: None,
        client_id: None,
        correlation_id: None,
        is_success: true,
        error_message: None,
        hash: None,
    }
}
