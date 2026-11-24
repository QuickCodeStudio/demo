//! Types for the Rust endpoint-workflow runtime (C# `WorkflowExecutor` / `Step` parity).
//! Idempotency (`idempotency.rs`) and the Kafka outbox (`platform/kafka/outbox.rs`) live beside this runtime.

use serde::Deserialize;
use serde_json::{Map, Value};

pub const ENDPOINT_WORKFLOW_DEFAULT_PATH: &str = "workflows/generated-endpoint-workflows.json";

/// One row of `workflows/generated-endpoint-workflows.json` (camelCase, ModuleEndpointWorkflowEmitter).
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EndpointWorkflowEntry {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub module_name: String,
    #[serde(default)]
    pub endpoint_path: String,
    #[serde(default)]
    pub http_method: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub workflow_content: String,
    #[serde(default)]
    pub is_active: bool,
}

/// YAML `headers:` / `transitions:` with no value parse as null — treat as empty.
fn null_as_default<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Default + Deserialize<'de>,
{
    Ok(Option::<T>::deserialize(deserializer)?.unwrap_or_default())
}

/// Scalar YAML values (`repeat: 3`, `maxItems: "5"`) as text; null/absent → `None`.
fn scalar_as_string<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Ok(match Option::<Value>::deserialize(deserializer)? {
        None | Some(Value::Null) => None,
        Some(Value::String(s)) => Some(s),
        Some(other) => Some(other.to_string()),
    })
}

/// Integer YAML values, tolerating quoted numbers; anything else → `None`.
fn lenient_i64<'de, D>(deserializer: D) -> Result<Option<i64>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Ok(match Option::<Value>::deserialize(deserializer)? {
        Some(Value::Number(n)) => n.as_i64(),
        Some(Value::String(s)) => s.trim().parse().ok(),
        _ => None,
    })
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct WorkflowTransition {
    /// `default` (or empty) always matches; otherwise `step.statusCode == 200`, `response.ok == true`, …
    #[serde(default)]
    pub condition: Option<String>,
    /// Next step name, or `success` | `end` | `fail`.
    #[serde(default)]
    pub action: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct WorkflowStep {
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub method: Option<String>,
    #[serde(default, deserialize_with = "null_as_default")]
    pub headers: Map<String, Value>,
    #[serde(default)]
    pub body: Value,
    #[serde(default, rename = "timeoutSeconds", alias = "timeout_seconds")]
    pub timeout_seconds: Option<f64>,
    #[serde(default, deserialize_with = "null_as_default")]
    pub transitions: Vec<WorkflowTransition>,
    #[serde(default)]
    pub condition: Option<String>,
    /// Retry count expression (`3` or `"{{variables.n}}"`); re-runs the step with exponential backoff.
    #[serde(default, deserialize_with = "scalar_as_string")]
    pub repeat: Option<String>,
    /// Sibling HTTP step names run concurrently (coordinator step has no URL).
    #[serde(default, deserialize_with = "null_as_default")]
    pub parallel: Vec<String>,
    /// `all` (default) | `any` | `failFast`.
    #[serde(default, deserialize_with = "scalar_as_string")]
    pub join: Option<String>,
    /// Token expression resolving to a JSON array, e.g. `{{input.lines}}`.
    #[serde(default, deserialize_with = "scalar_as_string")]
    pub foreach: Option<String>,
    /// Loop variable alias for `{{alias.field}}` tokens (default `item`).
    #[serde(default, rename = "as", deserialize_with = "scalar_as_string")]
    pub as_: Option<String>,
    /// Sibling HTTP step executed once per foreach item. YAML key: `step`.
    #[serde(
        default,
        rename = "itemStep",
        alias = "step",
        alias = "item_step",
        deserialize_with = "scalar_as_string"
    )]
    pub item_step: Option<String>,
    /// `sequential` (default) | `parallel`.
    #[serde(default, deserialize_with = "scalar_as_string")]
    pub mode: Option<String>,
    #[serde(default, rename = "maxItems", alias = "max_items", deserialize_with = "lenient_i64")]
    pub max_items: Option<i64>,
    /// Sibling step run (LIFO) when the workflow fails after this step succeeded with 2xx.
    #[serde(default, deserialize_with = "scalar_as_string")]
    pub compensate: Option<String>,
}

impl WorkflowStep {
    pub fn is_parallel_coordinator(&self) -> bool {
        !self.parallel.is_empty()
    }

    pub fn is_foreach_coordinator(&self) -> bool {
        self.foreach.as_deref().map(str::trim).is_some_and(|f| !f.is_empty())
    }

    /// Foreach item step name (`None` when blank).
    pub fn foreach_item_step(&self) -> Option<&str> {
        self.item_step.as_deref().map(str::trim).filter(|s| !s.is_empty())
    }
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct WorkflowVariable {
    #[serde(default, rename = "type")]
    pub kind: Option<String>,
    #[serde(default)]
    pub value: Value,
}

/// Parsed workflow YAML. `steps` / `variables` keep YAML declaration order (first step is the entry).
#[derive(Debug, Clone, Default)]
pub struct WorkflowDefinition {
    pub kind: Option<String>,
    pub name: Option<String>,
    pub variables: Vec<(String, WorkflowVariable)>,
    pub steps: Vec<(String, WorkflowStep)>,
    pub output: Value,
}

impl WorkflowDefinition {
    pub fn step(&self, name: &str) -> Option<&WorkflowStep> {
        self.steps.iter().find(|(n, _)| n == name).map(|(_, s)| s)
    }

    /// C#: `kind: endpoint` (or omitted) workflows project `output:`; other kinds return raw step results.
    pub fn is_endpoint(&self) -> bool {
        match self.kind.as_deref() {
            None => true,
            Some(k) => k.trim().is_empty() || k.trim().eq_ignore_ascii_case("endpoint"),
        }
    }
}

#[derive(Debug, Clone)]
pub struct EndpointWorkflowExecutionResult {
    pub success: bool,
    /// True when the YAML declared an `output:` projection (and the workflow is an endpoint workflow).
    pub has_output: bool,
    pub output: Option<Value>,
    /// Flat C#-style results: `{ "step.statusCode": 200, "step.response": {...} }`.
    pub steps: Map<String, Value>,
    /// Saga id (hex GUID) recorded in the in-memory saga store for this run.
    pub saga_id: String,
    /// Compensate steps that ran after a failure, in execution (LIFO) order.
    pub compensated_steps: Vec<String>,
}
