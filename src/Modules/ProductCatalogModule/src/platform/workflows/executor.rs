//! Nest `EndpointWorkflowExecutor` / C# `WorkflowExecutor` parity for `kind: endpoint` workflows:
//! HTTP steps, transitions, `{{tokens}}`, output projection, plus `parallel` (join all|any|failFast),
//! `foreach` (sequential|parallel), `compensate` (LIFO on failure), `repeat` (exponential backoff)
//! and an in-memory saga state store.
//!
//! Step evaluation order: condition → repeat → parallel → foreach → virtual (no url) → http.

use futures_util::future::{join_all, BoxFuture};
use once_cell::sync::Lazy;
use regex::{Captures, Regex};
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::future::Future;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::Duration;
use tokio_util::sync::CancellationToken;
use tracing::{error, info, warn};

use super::saga::{InMemorySagaStateStore, SagaStateRecord, SagaStatus};
use super::types::{
    EndpointWorkflowEntry, EndpointWorkflowExecutionResult, WorkflowDefinition, WorkflowStep,
    WorkflowVariable,
};
use crate::platform::http::mint_catalog_token;

const MAX_STEP_VISITS: usize = 100;
/// Concurrent branches per `parallel foreach` chunk (C# `WorkflowValidator.MaxParallelBranches`).
const MAX_PARALLEL_BRANCHES: usize = 8;
/// Foreach item cap (C# `WorkflowValidator.MaxForeachItems`).
const MAX_FOREACH_ITEMS: usize = 100;
const DEFAULT_TIMEOUT_SECONDS: f64 = 30.0;
const DEFAULT_RETRY_BASE_DELAY_MS: i64 = 1000;
const DEFAULT_MAX_RETRY_DELAY_MS: i64 = 30_000;

static TOKEN_REGEX: Lazy<Regex> = Lazy::new(|| Regex::new(r"\{\{(.*?)\}\}").expect("token regex"));
static FOREACH_TOKEN_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^\{\{\s*(.+?)\s*\}\}$").expect("foreach token regex"));
static CONDITION_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(\w+(?:\.\w+)*)\s*(==|!=|>=|<=|>|<)\s*(.+)").expect("condition regex")
});
static BOOL_REGEX: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)^(true|false)$").expect("bool regex"));
static INT_REGEX: Lazy<Regex> = Lazy::new(|| Regex::new(r"^-?\d+$").expect("int regex"));
static FLOAT_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^-?\d*\.\d+(?:[eE][+-]?\d+)?$").expect("float regex"));
static CAMEL_BOUNDARY: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"([a-z0-9])([A-Z])").expect("camel regex"));

#[derive(Clone)]
pub struct EndpointWorkflowExecutor {
    client: reqwest::Client,
    saga_store: Arc<InMemorySagaStateStore>,
}

impl Default for EndpointWorkflowExecutor {
    fn default() -> Self {
        Self::new()
    }
}

impl EndpointWorkflowExecutor {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        Self {
            client,
            saga_store: Arc::new(InMemorySagaStateStore::new()),
        }
    }

    /// Process-local saga state (look up by `EndpointWorkflowExecutionResult::saga_id`).
    pub fn saga_store(&self) -> &InMemorySagaStateStore {
        &self.saga_store
    }

    pub async fn execute(
        &self,
        entry: &EndpointWorkflowEntry,
        input: Map<String, Value>,
        correlation_id: &str,
    ) -> anyhow::Result<EndpointWorkflowExecutionResult> {
        let workflow = parse_workflow(&entry.workflow_content)?;
        let run = WorkflowRun::new(&self.client, &self.saga_store, &workflow, input, correlation_id);
        Ok(run.execute().await)
    }
}

/// Parses workflow YAML keeping `steps` / `variables` declaration order (first step = entry point).
pub fn parse_workflow(yaml: &str) -> anyhow::Result<WorkflowDefinition> {
    let root: serde_yaml::Value = serde_yaml::from_str(yaml)?;
    let mut def = WorkflowDefinition::default();
    let serde_yaml::Value::Mapping(map) = root else {
        return Ok(def);
    };

    for (key, value) in map {
        let Some(key) = key.as_str() else { continue };
        match key {
            "kind" => def.kind = value.as_str().map(str::to_string),
            "name" => def.name = value.as_str().map(str::to_string),
            "output" => def.output = serde_yaml::from_value(value)?,
            "variables" => {
                if let serde_yaml::Value::Mapping(vars) = value {
                    for (name, var) in vars {
                        let Some(name) = name.as_str() else { continue };
                        let var: WorkflowVariable = if var.is_mapping() {
                            serde_yaml::from_value(var)?
                        } else {
                            // `name: 5` shorthand
                            WorkflowVariable {
                                kind: None,
                                value: serde_yaml::from_value(var)?,
                            }
                        };
                        def.variables.push((name.to_string(), var));
                    }
                }
            }
            "steps" => {
                if let serde_yaml::Value::Mapping(steps) = value {
                    for (name, step) in steps {
                        let Some(name) = name.as_str() else { continue };
                        let step: WorkflowStep = if step.is_null() {
                            WorkflowStep::default()
                        } else {
                            serde_yaml::from_value(step)?
                        };
                        def.steps.push((name.to_string(), step));
                    }
                }
            }
            _ => {}
        }
    }
    Ok(def)
}

enum Flow {
    /// Workflow finished (true = success).
    Finish(bool),
    /// Continue with the named step.
    Goto(String),
}

/// Result of one HTTP round-trip (`None` from `send_http_step` = transport error / timeout / cancelled).
struct HttpOutcome {
    success: bool,
    response: Option<Value>,
}

/// Foreach loop variable visible to token replacement for one request only.
struct ItemScope<'s> {
    alias: &'s str,
    value: &'s Value,
}

fn lock<T>(m: &Mutex<T>) -> MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

async fn cancellable<F: Future>(cancel: Option<&CancellationToken>, fut: F) -> Option<F::Output> {
    match cancel {
        Some(token) => tokio::select! {
            _ = token.cancelled() => None,
            out = fut => Some(out),
        },
        None => Some(fut.await),
    }
}

/// Uniform value in `[0, 1)` without pulling in a RNG crate.
fn random_unit() -> f64 {
    (uuid::Uuid::new_v4().as_u128() & 0xFFFF_FFFF) as f64 / 4_294_967_296.0
}

struct WorkflowRun<'a> {
    client: &'a reqwest::Client,
    saga: &'a InMemorySagaStateStore,
    workflow: &'a WorkflowDefinition,
    input: Value,
    correlation_id: &'a str,
    saga_id: String,
    /// Flat C#-style results: `step.statusCode`, `step.response`.
    results: Mutex<Map<String, Value>>,
    variables: Mutex<HashMap<String, Value>>,
    /// `(completed step, compensate step)` — popped LIFO on failure.
    compensation_stack: Mutex<Vec<(String, String)>>,
    compensations_ran: AtomicBool,
    compensated_steps: Mutex<Vec<String>>,
}

impl<'a> WorkflowRun<'a> {
    fn new(
        client: &'a reqwest::Client,
        saga: &'a InMemorySagaStateStore,
        workflow: &'a WorkflowDefinition,
        input: Map<String, Value>,
        correlation_id: &'a str,
    ) -> Self {
        Self {
            client,
            saga,
            workflow,
            input: Value::Object(input),
            correlation_id,
            saga_id: uuid::Uuid::new_v4().simple().to_string(),
            results: Mutex::new(Map::new()),
            variables: Mutex::new(HashMap::new()),
            compensation_stack: Mutex::new(Vec::new()),
            compensations_ran: AtomicBool::new(false),
            compensated_steps: Mutex::new(Vec::new()),
        }
    }

    async fn execute(&self) -> EndpointWorkflowExecutionResult {
        let name = self.workflow.name.clone().unwrap_or_default();
        info!(
            "Starting workflow: {name} SagaId={} CorrelationId={}",
            self.saga_id, self.correlation_id
        );
        if !self.workflow.is_endpoint() {
            warn!(
                "Workflow {name} has kind '{}' — output projection only applies to endpoint workflows",
                self.workflow.kind.as_deref().unwrap_or("")
            );
        }
        self.initialize_variables();

        self.saga.start(SagaStateRecord::new(
            self.saga_id.clone(),
            name.clone(),
            self.workflow.kind.clone().unwrap_or_else(|| "endpoint".into()),
            (!self.correlation_id.is_empty()).then(|| self.correlation_id.to_string()),
        ));

        let first = self.workflow.steps.first().map(|(n, _)| n.clone());
        let success = match first {
            None => {
                warn!("Workflow {name} has no steps");
                true
            }
            Some(first) => self.run_steps(first).await,
        };

        if !success {
            self.run_compensations("workflow failed").await;
        }
        let compensated_steps = lock(&self.compensated_steps).clone();

        let status = if success {
            SagaStatus::Completed
        } else if !compensated_steps.is_empty() {
            SagaStatus::Compensated
        } else {
            SagaStatus::Failed
        };
        self.saga.complete(
            &self.saga_id,
            status,
            (!success).then(|| "workflow failed".to_string()),
        );

        let has_output = self.workflow.is_endpoint()
            && match &self.workflow.output {
                Value::Object(o) => !o.is_empty(),
                Value::Array(a) => !a.is_empty(),
                _ => false,
            };
        let output = if has_output && success {
            Some(self.resolve_output(&self.workflow.output))
        } else {
            None
        };

        info!(
            "Workflow {name} completed. Success={success} Compensated={}",
            compensated_steps.len()
        );
        EndpointWorkflowExecutionResult {
            success,
            has_output,
            output,
            steps: lock(&self.results).clone(),
            saga_id: self.saga_id.clone(),
            compensated_steps,
        }
    }

    // ── results / variables ────────────────────────────────────────────────

    fn set_result(&self, key: String, value: Value) {
        lock(&self.results).insert(key, value);
    }

    fn store_coordinator_result(&self, step_name: &str, ok: bool) {
        let mut results = lock(&self.results);
        results.insert(
            format!("{step_name}.statusCode"),
            Value::from(if ok { 200 } else { 500 }),
        );
        results.insert(format!("{step_name}.response"), json!({ "ok": ok }));
    }

    fn int_variable(&self, key: &str, default: i64) -> i64 {
        lock(&self.variables)
            .get(key)
            .and_then(Value::as_i64)
            .unwrap_or(default)
    }

    // ── steps ──────────────────────────────────────────────────────────────

    /// Boxed: `run_steps` → `execute_step` → `execute_repeat` → `run_steps` is recursive.
    fn run_steps(&self, first: String) -> BoxFuture<'_, bool> {
        Box::pin(async move {
            let mut current = first;
            let mut visits = 0usize;
            loop {
                if visits >= MAX_STEP_VISITS {
                    warn!("Workflow exceeded {MAX_STEP_VISITS} step transitions (loop?) at {current}");
                    return false;
                }
                match self.execute_step(&current).await {
                    Flow::Finish(ok) => return ok,
                    Flow::Goto(next) => {
                        current = next;
                        visits += 1;
                    }
                }
            }
        })
    }

    async fn execute_step(&self, step_name: &str) -> Flow {
        let Some(step) = self.workflow.step(step_name) else {
            warn!("Step {step_name} not found");
            return Flow::Finish(false);
        };
        self.execute_step_inner(step_name, step, true).await
    }

    /// condition → repeat → parallel → foreach → virtual → http.
    async fn execute_step_inner(&self, step_name: &str, step: &WorkflowStep, allow_repeat: bool) -> Flow {
        info!("Executing step: {step_name}");

        if let Some(cond) = step.condition.as_deref() {
            if !cond.trim().is_empty() && !self.evaluate_condition(Some(cond), None) {
                info!("Skipping step {step_name} due to condition");
                return Flow::Finish(true);
            }
        }

        if allow_repeat {
            if let Some(expr) = step.repeat.as_deref().filter(|r| !r.trim().is_empty()) {
                return self.execute_repeat(step_name, step, expr).await;
            }
        }

        if step.is_parallel_coordinator() {
            return self.execute_parallel(step_name, step).await;
        }

        if step.is_foreach_coordinator() {
            return self.execute_foreach(step_name, step).await;
        }

        // Virtual / transition-only step (no URL), e.g. routing hubs.
        if step.url.as_deref().map(str::trim).unwrap_or("").is_empty() {
            self.set_result(format!("{step_name}.statusCode"), Value::from(200));
            self.set_result(format!("{step_name}.response"), json!({ "ok": true }));
            let ok_body = json!({ "ok": true });
            return self
                .follow_transitions(step_name, step, Some(&ok_body))
                .unwrap_or(Flow::Finish(true));
        }

        self.execute_http_step(step_name, step).await
    }

    // ── repeat ─────────────────────────────────────────────────────────────

    /// Retries the step (without re-entering repeat) with exponential backoff + jitter.
    /// An attempt succeeds only if the step *and* the transition chain it starts succeed (C# recursion parity).
    fn execute_repeat<'s>(&'s self, step_name: &'s str, step: &'s WorkflowStep, expr: &'s str) -> BoxFuture<'s, Flow> {
        Box::pin(async move {
            let raw = self.replace_tokens(expr);
            let Ok(max_retries) = raw.trim().parse::<i64>() else {
                error!("Step {step_name}: repeat '{raw}' is not an integer");
                return Flow::Finish(false);
            };

            let mut current_retry: i64 = 0;
            while current_retry < max_retries {
                lock(&self.variables).insert("currentRetryCount".into(), Value::from(current_retry));
                let flow = self.execute_step_inner(step_name, step, false).await;
                let ok = match flow {
                    Flow::Finish(ok) => ok,
                    Flow::Goto(next) => self.run_steps(next).await,
                };
                if ok {
                    return Flow::Finish(true);
                }
                warn!("Step {step_name} failed on attempt {}", current_retry + 1);
                current_retry += 1;
                if current_retry < max_retries {
                    tokio::time::sleep(self.backoff_delay(current_retry - 1)).await;
                }
            }
            Flow::Finish(false)
        })
    }

    /// `baseDelay * 2^attempt * (0.5 + rand)` capped at `maxRetryDelayMs`.
    fn backoff_delay(&self, attempt: i64) -> Duration {
        let base = self.int_variable("retryBaseDelayMs", DEFAULT_RETRY_BASE_DELAY_MS);
        let max = self.int_variable("maxRetryDelayMs", DEFAULT_MAX_RETRY_DELAY_MS);
        let exponential = base as f64 * 2f64.powi(attempt.clamp(0, 30) as i32);
        let with_jitter = exponential * (0.5 + random_unit());
        Duration::from_millis(with_jitter.min(max as f64).max(0.0) as u64)
    }

    // ── parallel ───────────────────────────────────────────────────────────

    async fn execute_parallel(&self, step_name: &str, step: &WorkflowStep) -> Flow {
        let ok = self.run_named_steps(&step.parallel, step.join.as_deref()).await;
        self.store_coordinator_result(step_name, ok);
        self.follow_coordinator_transitions(step_name, step, ok)
    }

    async fn run_named_steps(&self, names: &[String], join: Option<&str>) -> bool {
        if names.is_empty() {
            return true;
        }
        let mode = join
            .map(|j| j.trim().to_lowercase())
            .filter(|j| !j.is_empty())
            .unwrap_or_else(|| "all".into());

        if mode == "failfast" {
            let token = CancellationToken::new();
            let results = join_all(names.iter().map(|n| self.run_named_child(n, Some(&token)))).await;
            return results.into_iter().all(|ok| ok);
        }

        let results = join_all(names.iter().map(|n| self.run_named_child(n, None))).await;
        if mode == "any" {
            results.into_iter().any(|ok| ok)
        } else {
            results.into_iter().all(|ok| ok)
        }
    }

    async fn run_named_child(&self, name: &str, fail_fast: Option<&CancellationToken>) -> bool {
        let Some(child) = self.workflow.step(name) else {
            warn!("Parallel child {name} is missing");
            if let Some(t) = fail_fast {
                t.cancel();
            }
            return false;
        };
        let ok = self
            .send_http_step(name, child, fail_fast, None, None)
            .await
            .is_some_and(|o| o.success);
        if !ok {
            if let Some(t) = fail_fast {
                t.cancel();
            }
        }
        ok
    }

    // ── foreach ────────────────────────────────────────────────────────────

    async fn execute_foreach(&self, step_name: &str, step: &WorkflowStep) -> Flow {
        let expr = step.foreach.as_deref().unwrap_or("");
        let items = self.resolve_foreach_array(expr);
        let max_items = match step.max_items {
            Some(n) if n > 0 => (n as usize).min(MAX_FOREACH_ITEMS),
            _ => MAX_FOREACH_ITEMS,
        };
        let alias = step
            .as_
            .as_deref()
            .map(str::trim)
            .filter(|a| !a.is_empty())
            .unwrap_or("item");

        let item_step = step
            .foreach_item_step()
            .and_then(|name| self.workflow.step(name).map(|s| (name, s)));
        let Some((item_step_name, item_step)) = item_step else {
            warn!(
                "Foreach {step_name} item step {:?} is missing",
                step.foreach_item_step()
            );
            self.store_coordinator_result(step_name, false);
            return Flow::Finish(false);
        };

        if items.len() > max_items {
            warn!(
                "Foreach {step_name} has {} items; processing the first {max_items}",
                items.len()
            );
        }
        let slice = &items[..items.len().min(max_items)];
        if slice.is_empty() {
            info!("Foreach {step_name} has no items; continuing");
            self.store_coordinator_result(step_name, true);
            return self.follow_coordinator_transitions(step_name, step, true);
        }

        let parallel = step
            .mode
            .as_deref()
            .is_some_and(|m| m.trim().eq_ignore_ascii_case("parallel"));
        let ok = if parallel {
            self.run_foreach_parallel(alias, item_step_name, item_step, slice).await
        } else {
            self.run_foreach_sequential(alias, item_step_name, item_step, slice).await
        };

        self.store_coordinator_result(step_name, ok);
        self.follow_coordinator_transitions(step_name, step, ok)
    }

    async fn run_foreach_sequential(
        &self,
        alias: &str,
        item_step_name: &str,
        item_step: &WorkflowStep,
        items: &[Value],
    ) -> bool {
        for (index, item) in items.iter().enumerate() {
            if !self.run_foreach_item(alias, item_step_name, item_step, item, index).await {
                return false;
            }
        }
        true
    }

    /// Chunks of `MAX_PARALLEL_BRANCHES`; a failed chunk stops later chunks.
    async fn run_foreach_parallel(
        &self,
        alias: &str,
        item_step_name: &str,
        item_step: &WorkflowStep,
        items: &[Value],
    ) -> bool {
        for (chunk_index, chunk) in items.chunks(MAX_PARALLEL_BRANCHES).enumerate() {
            let offset = chunk_index * MAX_PARALLEL_BRANCHES;
            let results = join_all(chunk.iter().enumerate().map(|(i, item)| {
                self.run_foreach_item(alias, item_step_name, item_step, item, offset + i)
            }))
            .await;
            if results.into_iter().any(|ok| !ok) {
                return false;
            }
        }
        true
    }

    /// Results stored at `{itemStep}.{index}.statusCode|response`.
    async fn run_foreach_item(
        &self,
        alias: &str,
        item_step_name: &str,
        item_step: &WorkflowStep,
        item: &Value,
        index: usize,
    ) -> bool {
        let scope = ItemScope { alias, value: item };
        let key = format!("{item_step_name}.{index}");
        self.send_http_step(item_step_name, item_step, None, Some(&scope), Some(&key))
            .await
            .is_some_and(|o| o.success)
    }

    /// `{{input.path}}` → array at that path; any other token expression → resolved text parsed as JSON.
    /// Non-array JSON becomes a single-item list; unresolved / unparsable → empty.
    fn resolve_foreach_array(&self, expr: &str) -> Vec<Value> {
        let trimmed = expr.trim();
        if let Some(caps) = FOREACH_TOKEN_REGEX.captures(trimmed) {
            if let Some(rest) = caps[1].trim().strip_prefix("input.") {
                return to_array(get_path(&self.input, rest));
            }
        }

        let replaced = self.replace_tokens(trimmed);
        if replaced.trim().is_empty() || replaced == trimmed {
            return Vec::new();
        }
        match serde_json::from_str::<Value>(&replaced) {
            Ok(parsed) => to_array(Some(&parsed)),
            Err(_) => Vec::new(),
        }
    }

    // ── http ───────────────────────────────────────────────────────────────

    /// HTTP step on the main path: follows transitions, else succeeds on 2xx.
    async fn execute_http_step(&self, step_name: &str, step: &WorkflowStep) -> Flow {
        let Some(outcome) = self.send_http_step(step_name, step, None, None, None).await else {
            return Flow::Finish(false);
        };
        if let Some(flow) = self.follow_transitions(step_name, step, outcome.response.as_ref()) {
            return flow;
        }
        Flow::Finish(outcome.success)
    }

    fn build_request(
        &self,
        step_name: &str,
        step: &WorkflowStep,
        scope: Option<&ItemScope<'_>>,
    ) -> Option<reqwest::RequestBuilder> {
        let method_str = step
            .method
            .as_deref()
            .map(str::trim)
            .filter(|m| !m.is_empty())
            .unwrap_or("GET")
            .to_uppercase();
        let Ok(method) = reqwest::Method::from_bytes(method_str.as_bytes()) else {
            error!("Step {step_name}: invalid HTTP method {method_str}");
            return None;
        };
        let url = self.replace_tokens_scoped(step.url.as_deref().unwrap_or(""), scope);

        let mut request = self.client.request(method.clone(), &url);
        let mut has_content_type = false;
        let mut has_correlation = false;
        for (key, value) in &step.headers {
            if key.eq_ignore_ascii_case("content-type") {
                has_content_type = true;
            }
            if key.eq_ignore_ascii_case("x-correlation-id") {
                has_correlation = true;
            }
            request = request.header(
                key.as_str(),
                self.replace_tokens_scoped(&scalar_to_string(value), scope),
            );
        }
        if !self.correlation_id.is_empty() && !has_correlation {
            request = request.header("X-Correlation-Id", self.correlation_id);
        }

        let has_body = match &step.body {
            Value::Object(o) => !o.is_empty(),
            Value::Array(a) => !a.is_empty(),
            _ => false,
        };
        if has_body {
            if method == reqwest::Method::GET || method == reqwest::Method::HEAD {
                warn!("Step {step_name}: body ignored for {method_str}");
            } else {
                let body = self.replace_tokens_deep(&step.body, scope);
                if !has_content_type {
                    request = request.header("Content-Type", "application/json");
                }
                request = request.body(body.to_string());
            }
        }

        let timeout = step
            .timeout_seconds
            .filter(|t| *t > 0.0)
            .unwrap_or(DEFAULT_TIMEOUT_SECONDS)
            .min(86_400.0);
        Some(request.timeout(Duration::from_secs_f64(timeout)))
    }

    /// Sends one request and records `{key}.statusCode` / `{key}.response` (`key` defaults to the step name).
    /// Registers `compensate` on 2xx. Never follows transitions. `None` = error, timeout or cancelled.
    async fn send_http_step(
        &self,
        step_name: &str,
        step: &WorkflowStep,
        cancel: Option<&CancellationToken>,
        scope: Option<&ItemScope<'_>>,
        result_key: Option<&str>,
    ) -> Option<HttpOutcome> {
        let request = self.build_request(step_name, step, scope)?;
        let store_key = result_key.unwrap_or(step_name);

        let response = match cancellable(cancel, request.send()).await {
            None => {
                warn!("Step {step_name} cancelled");
                return None;
            }
            Some(Ok(r)) => r,
            Some(Err(e)) => {
                if e.is_timeout() {
                    warn!("Step {step_name} timed out");
                } else {
                    error!("Error executing step {step_name}: {e}");
                }
                return None;
            }
        };

        let status = response.status();
        self.set_result(format!("{store_key}.statusCode"), Value::from(status.as_u16()));
        let text = match cancellable(cancel, response.text()).await {
            None => {
                warn!("Step {step_name} cancelled");
                return None;
            }
            Some(Ok(t)) => t,
            Some(Err(e)) => {
                error!("Error reading response of step {step_name}: {e}");
                return None;
            }
        };
        let parsed = try_parse_json(&text);
        self.set_result(
            format!("{store_key}.response"),
            parsed.clone().unwrap_or(Value::Null),
        );

        if status.is_success() && !self.compensations_ran.load(Ordering::SeqCst) {
            self.register_compensation(step_name, step);
        }

        info!(
            "Step {step_name} completed with status code {}",
            status.as_u16()
        );
        Some(HttpOutcome {
            success: status.is_success(),
            response: parsed,
        })
    }

    // ── transitions ────────────────────────────────────────────────────────

    /// `None` when no transition matched (caller falls back to HTTP status / join result).
    fn follow_transitions(
        &self,
        step_name: &str,
        step: &WorkflowStep,
        response: Option<&Value>,
    ) -> Option<Flow> {
        if step.transitions.is_empty() {
            return None;
        }
        for transition in &step.transitions {
            if !self.evaluate_condition(transition.condition.as_deref(), response) {
                continue;
            }
            let action = transition.action.as_deref().unwrap_or("").trim();
            let lower = action.to_lowercase();
            if action.is_empty() || lower == "success" || lower == "end" || lower == "fail" {
                info!(
                    "Step {step_name} reached terminal action {}",
                    if action.is_empty() { "success" } else { action }
                );
                return Some(Flow::Finish(lower != "fail"));
            }
            if self.workflow.step(action).is_none() {
                warn!("Transition from {step_name} targets unknown step {action}");
                return Some(Flow::Finish(false));
            }
            return Some(Flow::Goto(action.to_string()));
        }
        None
    }

    /// Coordinator (parallel / foreach) transitions evaluate against `{ ok }`; no match → join result.
    fn follow_coordinator_transitions(&self, step_name: &str, step: &WorkflowStep, ok: bool) -> Flow {
        let body = json!({ "ok": ok });
        self.follow_transitions(step_name, step, Some(&body))
            .unwrap_or(Flow::Finish(ok))
    }

    // ── compensate / saga ──────────────────────────────────────────────────

    fn register_compensation(&self, step_name: &str, step: &WorkflowStep) {
        let Some(compensate) = step.compensate.as_deref().map(str::trim).filter(|c| !c.is_empty()) else {
            return;
        };
        lock(&self.compensation_stack).push((step_name.to_string(), compensate.to_string()));
        self.saga.mark_step_completed(&self.saga_id, step_name);
        info!("Registered compensate {compensate} for step {step_name}");
    }

    /// Runs registered compensate steps LIFO (once per run). Compensate steps never follow transitions.
    async fn run_compensations(&self, reason: &str) {
        let pending = lock(&self.compensation_stack).len();
        if pending == 0 || self.compensations_ran.swap(true, Ordering::SeqCst) {
            return;
        }
        warn!(
            "Running {pending} compensation(s) for saga {}. Reason={reason}",
            self.saga_id
        );
        self.saga.mark_compensating(&self.saga_id);

        loop {
            let next = lock(&self.compensation_stack).pop();
            let Some((step_name, compensate_name)) = next else { break };
            let Some(compensate_step) = self.workflow.step(&compensate_name) else {
                error!("Compensate step {compensate_name} for {step_name} not found");
                continue;
            };

            info!("Compensating {step_name} via {compensate_name}");
            let ok = if compensate_step.url.as_deref().map(str::trim).unwrap_or("").is_empty() {
                true
            } else {
                self.send_http_step(&compensate_name, compensate_step, None, None, None)
                    .await
                    .is_some_and(|o| o.success)
            };
            if !ok {
                error!("Compensate step {compensate_name} failed for {step_name}");
            }

            lock(&self.compensated_steps).push(compensate_name.clone());
            self.saga.mark_step_compensated(&self.saga_id, &compensate_name);
        }
    }

    // ── conditions ─────────────────────────────────────────────────────────

    /// `a && b || c` — `&&` binds loosest (C# parity): every `&&` part needs at least one `||` hit.
    fn evaluate_condition(&self, condition: Option<&str>, response: Option<&Value>) -> bool {
        let Some(trimmed) = condition.map(str::trim) else {
            return true;
        };
        if trimmed.is_empty() || trimmed == "default" {
            return true;
        }
        trimmed
            .split("&&")
            .filter(|s| !s.trim().is_empty())
            .all(|and| {
                and.split("||")
                    .filter(|s| !s.trim().is_empty())
                    .any(|or| self.evaluate_single(or.trim(), response))
            })
    }

    fn evaluate_single(&self, condition: &str, response: Option<&Value>) -> bool {
        let Some(caps) = CONDITION_REGEX.captures(condition) else {
            return false;
        };
        let left = self.condition_value(caps[1].trim(), response);
        let right = self.condition_value(caps[3].trim(), response);
        compare_values(&left, &caps[2], &right)
    }

    fn condition_value(&self, path: &str, response: Option<&Value>) -> Value {
        if path.starts_with("response.") && response.is_some() {
            if let Some(found) = response.and_then(|r| get_path(r, &path["response.".len()..])) {
                return found.clone();
            }
        } else {
            let variable = lock(&self.variables).get(path).cloned();
            if let Some(v) = variable {
                return v;
            }
            let result = lock(&self.results).get(path).cloned();
            if let Some(v) = result {
                return v;
            }
        }
        Value::String(path.trim_matches(|c| c == '"' || c == '\'').to_string())
    }

    // ── tokens ─────────────────────────────────────────────────────────────

    fn initialize_variables(&self) {
        for (key, def) in &self.workflow.variables {
            let raw = self.replace_tokens(&scalar_to_string(&def.value));
            let value = match def.kind.as_deref().unwrap_or("").to_lowercase().as_str() {
                "int" => raw
                    .trim()
                    .parse::<i64>()
                    .map(Value::from)
                    .unwrap_or(Value::Null),
                "double" => raw
                    .trim()
                    .parse::<f64>()
                    .ok()
                    .and_then(serde_json::Number::from_f64)
                    .map(Value::Number)
                    .unwrap_or(Value::Null),
                "bool" => Value::Bool(raw.to_lowercase() == "true"),
                _ => Value::String(raw),
            };
            lock(&self.variables).insert(key.clone(), value);
        }
    }

    fn replace_tokens(&self, text: &str) -> String {
        self.replace_tokens_scoped(text, None)
    }

    fn replace_tokens_scoped(&self, text: &str, scope: Option<&ItemScope<'_>>) -> String {
        TOKEN_REGEX
            .replace_all(text, |caps: &Captures| {
                self.resolve_token(caps[1].trim(), &caps[0], scope)
            })
            .into_owned()
    }

    fn replace_tokens_deep(&self, value: &Value, scope: Option<&ItemScope<'_>>) -> Value {
        match value {
            Value::String(s) => Value::String(self.replace_tokens_scoped(s, scope)),
            Value::Array(a) => Value::Array(a.iter().map(|v| self.replace_tokens_deep(v, scope)).collect()),
            Value::Object(o) => Value::Object(
                o.iter()
                    .map(|(k, v)| (k.clone(), self.replace_tokens_deep(v, scope)))
                    .collect(),
            ),
            other => other.clone(),
        }
    }

    fn resolve_token(&self, key: &str, fallback: &str, scope: Option<&ItemScope<'_>>) -> String {
        if key.starts_with("QuickcodeClients.") || key.starts_with("ThirdPartyServices.") {
            return match resolve_config_value(key, &[""]) {
                Some(v) => v.trim_end_matches('/').to_string(),
                None => fallback.to_string(),
            };
        }
        if let Some(rest) = key.strip_prefix("parameters.") {
            return match resolve_config_value(rest, &["WorkflowParameters", "Parameters"]) {
                Some(v) => v.trim_end_matches('/').to_string(),
                None => fallback.to_string(),
            };
        }
        if let Some(rest) = key.strip_prefix("secrets.") {
            return resolve_config_value(rest, &["WorkflowSecrets", "Secrets"])
                .unwrap_or_else(|| fallback.to_string());
        }
        if let Some(target) = key.strip_prefix("GatewayServiceToken.") {
            return match mint_catalog_token(target) {
                Ok(token) => token,
                Err(e) => {
                    warn!("GatewayServiceToken for {target} unavailable: {e}");
                    String::new()
                }
            };
        }
        if let Some(rest) = key.strip_prefix("variables.") {
            let variable = lock(&self.variables).get(rest).cloned();
            return match variable {
                None | Some(Value::Null) => fallback.to_string(),
                Some(v) => stringify_token(Some(&v), fallback),
            };
        }
        if let Some(rest) = key.strip_prefix("input.") {
            return stringify_token(get_path(&self.input, rest), fallback);
        }
        if let Some(scope) = scope {
            let resolved = resolve_item_scope_token(scope, key, fallback);
            if resolved != fallback {
                return resolved;
            }
        }
        self.resolve_result_token(key, fallback)
    }

    /// `{{step.statusCode}}`, `{{step.response}}`, `{{step.response.a.b}}`, `{{itemStep.0.statusCode}}`
    fn resolve_result_token(&self, key: &str, fallback: &str) -> String {
        let results = lock(&self.results);
        if let Some(v) = results.get(key) {
            return stringify_token(Some(v), fallback);
        }
        let mut from = 0;
        while let Some(rel) = key[from..].find('.') {
            let dot = from + rel;
            if dot > 0 {
                if let Some(base) = results.get(&key[..dot]) {
                    return stringify_token(get_path(base, &key[dot + 1..]), fallback);
                }
            }
            from = dot + 1;
        }
        fallback.to_string()
    }

    // ── output ─────────────────────────────────────────────────────────────

    fn resolve_output(&self, token: &Value) -> Value {
        match token {
            Value::Array(a) => Value::Array(a.iter().map(|t| self.resolve_output(t)).collect()),
            Value::Object(o) => Value::Object(
                o.iter()
                    .map(|(k, v)| (k.clone(), self.resolve_output(v)))
                    .collect(),
            ),
            Value::String(s) => {
                let replaced = self.replace_tokens(s);
                if &replaced != s {
                    if let Some(parsed) = try_parse_json(&replaced) {
                        return parsed;
                    }
                }
                if BOOL_REGEX.is_match(&replaced) {
                    return Value::Bool(replaced.eq_ignore_ascii_case("true"));
                }
                if INT_REGEX.is_match(&replaced) {
                    if let Ok(n) = replaced.parse::<i64>() {
                        return Value::from(n);
                    }
                }
                if FLOAT_REGEX.is_match(&replaced) {
                    if let Some(n) = replaced.parse::<f64>().ok().and_then(serde_json::Number::from_f64) {
                        return Value::Number(n);
                    }
                }
                Value::String(replaced)
            }
            other => other.clone(),
        }
    }
}

/// `{{line}}` → the item itself, `{{line.sku}}` → a path inside it; otherwise `fallback`.
fn resolve_item_scope_token(scope: &ItemScope<'_>, key: &str, fallback: &str) -> String {
    if key.eq_ignore_ascii_case(scope.alias) {
        return stringify_token(Some(scope.value), fallback);
    }
    let prefix_len = scope.alias.len() + 1;
    if let Some(prefix) = key.get(..prefix_len) {
        let head_matches = prefix
            .get(..scope.alias.len())
            .is_some_and(|h| h.eq_ignore_ascii_case(scope.alias));
        if head_matches && prefix.ends_with('.') {
            return stringify_token(get_path(scope.value, &key[prefix_len..]), fallback);
        }
    }
    fallback.to_string()
}

fn to_array(v: Option<&Value>) -> Vec<Value> {
    match v {
        None => Vec::new(),
        Some(Value::Array(a)) => a.clone(),
        Some(other) => vec![other.clone()],
    }
}

// ── helpers ────────────────────────────────────────────────────────────────

fn try_parse_json(text: &str) -> Option<Value> {
    if text.trim().is_empty() {
        return None;
    }
    serde_json::from_str(text).ok()
}

/// Scalars as plain text (YAML `value: 5` → `"5"`); null → empty.
fn scalar_to_string(v: &Value) -> String {
    match v {
        Value::Null => String::new(),
        Value::String(s) => s.clone(),
        other => other.to_string(),
    }
}

fn stringify_token(value: Option<&Value>, fallback: &str) -> String {
    match value {
        None | Some(Value::Null) => fallback.to_string(),
        Some(Value::String(s)) => s.clone(),
        Some(other) => other.to_string(),
    }
}

/// Dot / `[n]` path lookup with case-insensitive property fallback.
pub fn get_path<'v>(source: &'v Value, path: &str) -> Option<&'v Value> {
    let mut current = source;
    for segment in split_path(path) {
        current = match current {
            Value::Object(obj) => match obj.get(&segment) {
                Some(v) => v,
                None => {
                    let lower = segment.to_lowercase();
                    obj.iter().find(|(k, _)| k.to_lowercase() == lower)?.1
                }
            },
            Value::Array(arr) => arr.get(segment.parse::<usize>().ok()?)?,
            _ => return None,
        };
    }
    Some(current)
}

/// `a.b[0].c` → `["a", "b", "0", "c"]`
fn split_path(path: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut cur = String::new();
    for ch in path.chars() {
        match ch {
            '.' | '[' | ']' => {
                if !cur.is_empty() {
                    out.push(std::mem::take(&mut cur));
                }
            }
            c => cur.push(c),
        }
    }
    if !cur.is_empty() {
        out.push(cur);
    }
    out
}

fn as_number(v: &Value) -> Option<f64> {
    match v {
        Value::Number(n) => n.as_f64().filter(|f| f.is_finite()),
        Value::String(s) if !s.trim().is_empty() => s.trim().parse::<f64>().ok().filter(|f| f.is_finite()),
        _ => None,
    }
}

fn value_text(v: &Value) -> String {
    match v {
        Value::Null => String::new(),
        Value::String(s) => s.to_lowercase(),
        other => other.to_string().to_lowercase(),
    }
}

fn compare_values(left: &Value, op: &str, right: &Value) -> bool {
    if let (Some(l), Some(r)) = (as_number(left), as_number(right)) {
        return match op {
            "==" => (l - r).abs() < 1e-6,
            "!=" => (l - r).abs() >= 1e-6,
            ">" => l > r,
            "<" => l < r,
            ">=" => l >= r,
            "<=" => l <= r,
            _ => false,
        };
    }
    let l = value_text(left);
    let r = value_text(right);
    match op {
        "==" => l == r,
        "!=" => l != r,
        _ => false,
    }
}

/// `QuickcodeClients.IdentityModuleApi` → env `QuickcodeClients__IdentityModuleApi` (ASP.NET style),
/// its upper-case form, or `IDENTITY_MODULE_API` (snake). Section roots are tried in order for parameters/secrets.
fn resolve_config_value(dotted: &str, roots: &[&str]) -> Option<String> {
    let mut candidates: Vec<String> = Vec::new();
    for root in roots {
        let full = if root.is_empty() {
            dotted.to_string()
        } else {
            format!("{root}.{dotted}")
        };
        let flat = full.replace('.', "__");
        candidates.push(flat.clone());
        candidates.push(flat.to_uppercase());
    }
    if roots.iter().all(|r| r.is_empty()) {
        let last = dotted.rsplit('.').next().unwrap_or(dotted);
        candidates.push(CAMEL_BOUNDARY.replace_all(last, "${1}_${2}").to_uppercase());
    }
    candidates.into_iter().find_map(|name| {
        std::env::var(&name)
            .ok()
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty())
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn entry(yaml: &str) -> EndpointWorkflowEntry {
        EndpointWorkflowEntry {
            name: "wf".into(),
            module_name: "M".into(),
            endpoint_path: "/x".into(),
            http_method: "POST".into(),
            description: None,
            workflow_content: yaml.into(),
            is_active: true,
        }
    }

    async fn run(yaml: &str, input: Value) -> EndpointWorkflowExecutionResult {
        let Value::Object(input) = input else { panic!("input must be object") };
        EndpointWorkflowExecutor::new()
            .execute(&entry(yaml), input, "corr-1")
            .await
            .expect("execute")
    }

    #[test]
    fn get_path_is_case_insensitive_and_indexes_arrays() {
        let v = json!({ "Items": [{ "Id": 7 }] });
        assert_eq!(get_path(&v, "items[0].id"), Some(&json!(7)));
        assert_eq!(get_path(&v, "items.0.id"), Some(&json!(7)));
        assert!(get_path(&v, "items.1.id").is_none());
    }

    #[test]
    fn parse_workflow_keeps_step_order() {
        let def = parse_workflow("kind: endpoint\nsteps:\n  zeta: {}\n  alpha:\n  mid:\n    url: http://x\n").unwrap();
        let names: Vec<_> = def.steps.iter().map(|(n, _)| n.as_str()).collect();
        assert_eq!(names, ["zeta", "alpha", "mid"]);
    }

    #[tokio::test]
    async fn virtual_step_with_output_projection_and_input_tokens() {
        let yaml = r#"
kind: endpoint
name: wf
steps:
  hub:
    transitions:
      - condition: default
        action: success
output:
  id: "{{input.orderId}}"
  count: "{{input.qty}}"
  flag: "true"
  nested:
    status: "{{hub.statusCode}}"
  literal: hello
"#;
        let res = run(yaml, json!({ "orderId": "o-1", "qty": 3 })).await;
        assert!(res.success && res.has_output);
        assert_eq!(
            res.output.unwrap(),
            json!({ "id": "o-1", "count": 3, "flag": true, "nested": { "status": 200 }, "literal": "hello" })
        );
    }

    #[tokio::test]
    async fn transitions_branch_on_conditions_and_fail() {
        let yaml = r#"
kind: endpoint
steps:
  start:
    transitions:
      - condition: start.statusCode == 500
        action: boom
      - condition: response.ok == true && start.statusCode >= 200
        action: finish
  boom:
    transitions:
      - condition: default
        action: fail
  finish:
    transitions:
      - condition: default
        action: success
"#;
        let res = run(yaml, json!({})).await;
        assert!(res.success);
        assert!(res.steps.contains_key("finish.statusCode"));
        assert!(!res.steps.contains_key("boom.statusCode"));

        let failing = r#"
kind: endpoint
steps:
  start:
    transitions:
      - condition: default
        action: fail
"#;
        assert!(!run(failing, json!({})).await.success);
    }

    // ── mock HTTP server (axum on an ephemeral port, same style as the roundtrip tests) ──

    #[derive(Default)]
    struct Mock {
        /// `"METHOD /path"` in arrival order.
        hits: Mutex<Vec<String>>,
        bodies: Mutex<Vec<(String, String)>>,
        flaky_calls: Mutex<usize>,
    }

    async fn mock_handler(
        axum::extract::State(mock): axum::extract::State<Arc<Mock>>,
        method: axum::http::Method,
        uri: axum::http::Uri,
        body: axum::body::Bytes,
    ) -> (axum::http::StatusCode, axum::Json<Value>) {
        use axum::http::StatusCode;
        let path = uri.path().to_string();
        mock.hits.lock().unwrap().push(format!("{method} {path}"));
        let body = String::from_utf8_lossy(&body).to_string();
        mock.bodies.lock().unwrap().push((path.clone(), body.clone()));
        if path.starts_with("/slow") {
            tokio::time::sleep(Duration::from_millis(400)).await;
            return (StatusCode::OK, axum::Json(json!({ "path": path })));
        }
        if path.starts_with("/fail") {
            return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(json!({ "path": path })));
        }
        if path.starts_with("/flaky") {
            let mut calls = mock.flaky_calls.lock().unwrap();
            *calls += 1;
            let code = if *calls < 3 { StatusCode::SERVICE_UNAVAILABLE } else { StatusCode::OK };
            return (code, axum::Json(json!({ "call": *calls })));
        }
        let parsed: Value = serde_json::from_str(&body).unwrap_or(Value::Null);
        (StatusCode::OK, axum::Json(json!({ "path": path, "body": parsed })))
    }

    async fn spawn_mock() -> (String, Arc<Mock>) {
        let mock = Arc::new(Mock::default());
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let app = axum::Router::new().fallback(mock_handler).with_state(mock.clone());
        tokio::spawn(async move {
            axum::serve(listener, app).await.ok();
        });
        (format!("http://{addr}"), mock)
    }

    /// Runs `yaml` (with `BASE` replaced by the mock URL) on a fresh executor so saga state can be inspected.
    async fn run_on(
        executor: &EndpointWorkflowExecutor,
        yaml: &str,
        base: &str,
        input: Value,
    ) -> EndpointWorkflowExecutionResult {
        let Value::Object(input) = input else { panic!("input must be object") };
        executor
            .execute(&entry(&yaml.replace("BASE", base)), input, "corr-1")
            .await
            .expect("execute")
    }

    #[test]
    fn step_fields_deserialize_from_yaml() {
        let yaml = r#"
kind: endpoint
steps:
  fan:
    parallel: [a, b]
    join: failFast
    repeat: 3
  each:
    foreach: "{{input.lines}}"
    as: line
    step: callLine
    mode: parallel
    maxItems: 5
  callLine:
    url: http://x
    compensate: undo
"#;
        let def = parse_workflow(yaml).unwrap();
        let fan = def.step("fan").unwrap();
        assert_eq!(fan.parallel, ["a", "b"]);
        assert_eq!(fan.join.as_deref(), Some("failFast"));
        assert_eq!(fan.repeat.as_deref(), Some("3"));
        assert!(fan.is_parallel_coordinator() && !fan.is_foreach_coordinator());
        let each = def.step("each").unwrap();
        assert_eq!(each.foreach.as_deref(), Some("{{input.lines}}"));
        assert_eq!(each.as_.as_deref(), Some("line"));
        assert_eq!(each.foreach_item_step(), Some("callLine"));
        assert_eq!(each.mode.as_deref(), Some("parallel"));
        assert_eq!(each.max_items, Some(5));
        assert!(each.is_foreach_coordinator());
        assert_eq!(def.step("callLine").unwrap().compensate.as_deref(), Some("undo"));
    }

    // ── parallel ──

    #[tokio::test]
    async fn parallel_all_success_runs_children_concurrently_and_stores_coordinator_result() {
        let (base, mock) = spawn_mock().await;
        let yaml = r#"
kind: endpoint
steps:
  fan:
    parallel: [slowA, slowB, quick]
    transitions:
      - condition: response.ok == true
        action: done
  done:
    transitions:
      - condition: default
        action: success
  slowA:
    url: BASE/slow/a
  slowB:
    url: BASE/slow/b
  quick:
    url: BASE/quick
output:
  fan: "{{fan.statusCode}}"
  a: "{{slowA.statusCode}}"
  b: "{{slowB.response.path}}"
"#;
        let started = std::time::Instant::now();
        let res = run_on(&EndpointWorkflowExecutor::new(), yaml, &base, json!({})).await;
        let elapsed = started.elapsed();

        assert!(res.success, "steps: {:?}", res.steps);
        assert_eq!(res.output.unwrap(), json!({ "fan": 200, "a": 200, "b": "/slow/b" }));
        assert_eq!(res.steps.get("fan.response"), Some(&json!({ "ok": true })));
        assert_eq!(res.steps.get("quick.statusCode"), Some(&json!(200)));
        assert!(res.steps.contains_key("done.statusCode"), "coordinator transition followed");
        assert_eq!(mock.hits.lock().unwrap().len(), 3);
        // two 400ms children in sequence would take >= 800ms
        assert!(elapsed < Duration::from_millis(780), "ran sequentially: {elapsed:?}");
    }

    #[tokio::test]
    async fn parallel_join_modes_all_any_and_failfast() {
        let (base, _mock) = spawn_mock().await;
        let template = |join: &str| {
            format!(
                "kind: endpoint\nsteps:\n  fan:\n    parallel: [good, bad]\n    join: {join}\n  good:\n    url: BASE/good\n  bad:\n    url: BASE/fail\n"
            )
        };
        let ex = EndpointWorkflowExecutor::new();
        assert!(!run_on(&ex, &template("all"), &base, json!({})).await.success);
        let any = run_on(&ex, &template("any"), &base, json!({})).await;
        assert!(any.success);
        assert_eq!(any.steps.get("fan.statusCode"), Some(&json!(200)));

        // failFast cancels the slow sibling once the failing child returns
        let yaml = "kind: endpoint\nsteps:\n  fan:\n    parallel: [slow, bad]\n    join: failFast\n  slow:\n    url: BASE/slow/x\n  bad:\n    url: BASE/fail\n";
        let res = run_on(&ex, yaml, &base, json!({})).await;
        assert!(!res.success);
        assert_eq!(res.steps.get("fan.statusCode"), Some(&json!(500)));
        assert_eq!(res.steps.get("fan.response"), Some(&json!({ "ok": false })));
        assert!(!res.steps.contains_key("slow.statusCode"), "slow child should be cancelled");
    }

    // ── foreach ──

    #[tokio::test]
    async fn foreach_sequential_with_item_tokens_and_indexed_results() {
        let (base, mock) = spawn_mock().await;
        let yaml = r#"
kind: endpoint
steps:
  lines:
    foreach: "{{input.lines}}"
    as: line
    step: callLine
    transitions:
      - condition: response.ok == true
        action: finish
  finish:
    transitions:
      - condition: default
        action: success
  callLine:
    url: BASE/lines/{{line.sku}}
    method: POST
    headers:
      X-Qty: "{{line.qty}}"
    body:
      sku: "{{line.sku}}"
      order: "{{input.orderId}}"
output:
  first: "{{callLine.0.response.body.sku}}"
  second: "{{callLine.1.response.path}}"
  code: "{{callLine.1.statusCode}}"
  coordinator: "{{lines.statusCode}}"
"#;
        let input = json!({ "orderId": "o-9", "lines": [{ "sku": "A1", "qty": 2 }, { "sku": "B2", "qty": 5 }] });
        let res = run_on(&EndpointWorkflowExecutor::new(), yaml, &base, input).await;

        assert!(res.success, "steps: {:?}", res.steps);
        assert_eq!(
            res.output.unwrap(),
            json!({ "first": "A1", "second": "/lines/B2", "code": 200, "coordinator": 200 })
        );
        assert_eq!(*mock.hits.lock().unwrap(), ["POST /lines/A1", "POST /lines/B2"]);
        let bodies = mock.bodies.lock().unwrap();
        assert_eq!(serde_json::from_str::<Value>(&bodies[0].1).unwrap(), json!({ "sku": "A1", "order": "o-9" }));
        // item alias is only in scope per request: not left behind as a result
        assert!(!res.steps.contains_key("callLine.statusCode"));
    }

    #[tokio::test]
    async fn foreach_sequential_stops_at_first_failure() {
        let (base, mock) = spawn_mock().await;
        let yaml = r#"
kind: endpoint
steps:
  each:
    foreach: "{{input.ids}}"
    step: call
  call:
    url: BASE/{{item}}
"#;
        let res = run_on(&EndpointWorkflowExecutor::new(), yaml, &base, json!({ "ids": ["ok1", "fail", "ok3"] })).await;
        assert!(!res.success);
        assert_eq!(res.steps.get("each.statusCode"), Some(&json!(500)));
        assert_eq!(res.steps.get("call.1.statusCode"), Some(&json!(500)));
        assert!(!res.steps.contains_key("call.2.statusCode"));
        assert_eq!(mock.hits.lock().unwrap().len(), 2);
    }

    #[tokio::test]
    async fn foreach_parallel_chunks_and_max_items_cap() {
        let (base, mock) = spawn_mock().await;
        let yaml = r#"
kind: endpoint
steps:
  each:
    foreach: "{{input.ids}}"
    mode: parallel
    maxItems: 10
    step: call
  call:
    url: BASE/n/{{item}}
"#;
        let ids: Vec<Value> = (0..25).map(Value::from).collect();
        let res = run_on(&EndpointWorkflowExecutor::new(), yaml, &base, json!({ "ids": ids })).await;
        assert!(res.success, "steps: {:?}", res.steps);
        assert_eq!(mock.hits.lock().unwrap().len(), 10);
        assert_eq!(res.steps.get("call.9.statusCode"), Some(&json!(200)));
        assert!(!res.steps.contains_key("call.10.statusCode"));
        assert_eq!(res.steps.get("call.9.response").unwrap()["path"], json!("/n/9"));
    }

    #[tokio::test]
    async fn foreach_empty_or_unresolved_array_succeeds_and_missing_item_step_fails() {
        let ex = EndpointWorkflowExecutor::new();
        let empty = "kind: endpoint\nsteps:\n  each:\n    foreach: \"{{input.nope}}\"\n    step: call\n  call:\n    url: http://127.0.0.1:1/x\n";
        let res = run_on(&ex, empty, "", json!({})).await;
        assert!(res.success);
        assert_eq!(res.steps.get("each.response"), Some(&json!({ "ok": true })));

        let missing = "kind: endpoint\nsteps:\n  each:\n    foreach: \"{{input.xs}}\"\n    step: ghost\n";
        let res = run_on(&ex, missing, "", json!({ "xs": [1] })).await;
        assert!(!res.success);
        assert_eq!(res.steps.get("each.statusCode"), Some(&json!(500)));
    }

    // ── compensate / saga ──

    #[tokio::test]
    async fn compensate_runs_lifo_on_failure_without_following_transitions() {
        let (base, mock) = spawn_mock().await;
        let yaml = r#"
kind: endpoint
name: order
steps:
  reserve:
    url: BASE/reserve
    method: POST
    compensate: undoReserve
    transitions:
      - condition: default
        action: charge
  charge:
    url: BASE/charge
    method: POST
    compensate: refund
    transitions:
      - condition: default
        action: ship
  ship:
    url: BASE/fail/ship
    method: POST
  undoReserve:
    url: BASE/undo-reserve
    method: POST
    transitions:
      - condition: default
        action: reserve
  refund:
    url: BASE/refund
    method: POST
    transitions:
      - condition: default
        action: reserve
"#;
        let ex = EndpointWorkflowExecutor::new();
        let res = run_on(&ex, yaml, &base, json!({})).await;

        assert!(!res.success);
        assert_eq!(res.compensated_steps, ["refund", "undoReserve"]);
        assert_eq!(
            *mock.hits.lock().unwrap(),
            [
                "POST /reserve",
                "POST /charge",
                "POST /fail/ship",
                "POST /refund",
                "POST /undo-reserve"
            ]
        );
        let saga = ex.saga_store().get(&res.saga_id).expect("saga recorded");
        assert_eq!(saga.status, SagaStatus::Compensated);
        assert_eq!(saga.workflow_name, "order");
        assert_eq!(saga.completed_steps, ["reserve", "charge"]);
        assert_eq!(saga.compensated_steps, ["refund", "undoReserve"]);
        assert_eq!(saga.correlation_id.as_deref(), Some("corr-1"));
        assert_eq!(saga.last_error.as_deref(), Some("workflow failed"));
    }

    #[tokio::test]
    async fn compensate_not_run_on_success_and_failure_without_registered_compensation_is_failed() {
        let (base, mock) = spawn_mock().await;
        let ok = "kind: endpoint\nsteps:\n  a:\n    url: BASE/a\n    compensate: undo\n  undo:\n    url: BASE/undo\n";
        let ex = EndpointWorkflowExecutor::new();
        let res = run_on(&ex, ok, &base, json!({})).await;
        assert!(res.success && res.compensated_steps.is_empty());
        assert_eq!(*mock.hits.lock().unwrap(), ["GET /a"]);
        assert_eq!(ex.saga_store().get(&res.saga_id).unwrap().status, SagaStatus::Completed);

        // a 5xx step never registers its compensation; nothing earlier registered either
        let bad = "kind: endpoint\nsteps:\n  a:\n    url: BASE/fail/a\n    compensate: undo\n  undo:\n    url: BASE/undo\n";
        let res = run_on(&ex, bad, &base, json!({})).await;
        assert!(!res.success && res.compensated_steps.is_empty());
        assert_eq!(ex.saga_store().get(&res.saga_id).unwrap().status, SagaStatus::Failed);
        assert!(!mock.hits.lock().unwrap().iter().any(|h| h.contains("undo")));
    }

    #[tokio::test]
    async fn compensate_registered_per_foreach_item() {
        let (base, mock) = spawn_mock().await;
        let yaml = r#"
kind: endpoint
steps:
  each:
    foreach: "{{input.ids}}"
    step: take
  take:
    url: BASE/{{item}}
    compensate: give
  give:
    url: BASE/give
"#;
        // third item (`/fail`) fails -> the two earlier registered compensations run
        let res = run_on(&EndpointWorkflowExecutor::new(), yaml, &base, json!({ "ids": ["a", "b", "fail"] })).await;
        assert!(!res.success);
        assert_eq!(res.compensated_steps, ["give", "give"]);
        assert_eq!(mock.hits.lock().unwrap().iter().filter(|h| h.ends_with("/give")).count(), 2);
    }

    // ── repeat ──

    #[tokio::test]
    async fn repeat_retries_with_backoff_until_success() {
        let (base, mock) = spawn_mock().await;
        let yaml = r#"
kind: endpoint
variables:
  retryBaseDelayMs:
    type: int
    value: 1
steps:
  call:
    url: BASE/flaky
    repeat: 5
output:
  attempt: "{{call.response.call}}"
  retry: "{{variables.currentRetryCount}}"
"#;
        let res = run_on(&EndpointWorkflowExecutor::new(), yaml, &base, json!({})).await;
        assert!(res.success, "steps: {:?}", res.steps);
        assert_eq!(res.output.unwrap(), json!({ "attempt": 3, "retry": 2 }));
        assert_eq!(mock.hits.lock().unwrap().len(), 3);
    }

    #[tokio::test]
    async fn repeat_exhausts_attempts_and_fails() {
        let (base, mock) = spawn_mock().await;
        let yaml = "kind: endpoint\nvariables:\n  retryBaseDelayMs: 1\nsteps:\n  call:\n    url: BASE/fail/x\n    repeat: \"2\"\n";
        let res = run_on(&EndpointWorkflowExecutor::new(), yaml, &base, json!({})).await;
        assert!(!res.success);
        assert_eq!(mock.hits.lock().unwrap().len(), 2);
    }

    #[test]
    fn backoff_is_exponential_with_jitter_and_capped() {
        let def = WorkflowDefinition::default();
        let client = reqwest::Client::new();
        let saga = InMemorySagaStateStore::new();
        let run = WorkflowRun::new(&client, &saga, &def, Map::new(), "");
        for _ in 0..50 {
            let d0 = run.backoff_delay(0).as_millis();
            assert!((500..1500).contains(&d0), "{d0}");
            let d3 = run.backoff_delay(3).as_millis();
            assert!((4000..12000).contains(&d3), "{d3}");
            assert!(run.backoff_delay(20).as_millis() <= 30_000);
        }
    }


    #[tokio::test]
    async fn loop_guard_stops_runaway_transitions() {
        let yaml = "kind: endpoint\nsteps:\n  a:\n    transitions:\n      - condition: default\n        action: a\n";
        assert!(!run(yaml, json!({})).await.success);
    }

    #[tokio::test]
    async fn variables_and_unresolved_tokens() {
        let yaml = r#"
kind: endpoint
variables:
  limit:
    type: int
    value: "{{input.n}}"
steps:
  s:
    transitions:
      - condition: limit == 5
        action: success
output:
  limit: "{{variables.limit}}"
  missing: "{{input.nope}}"
"#;
        let res = run(yaml, json!({ "n": "5" })).await;
        assert!(res.success);
        assert_eq!(res.output.unwrap(), json!({ "limit": 5, "missing": "{{input.nope}}" }));
    }

    #[tokio::test]
    async fn http_step_roundtrip_with_tokens() {
        use axum::{routing::post, Json, Router};

        async fn echo(headers: axum::http::HeaderMap, Json(body): Json<Value>) -> Json<Value> {
            let corr = headers
                .get("x-correlation-id")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("")
                .to_string();
            Json(json!({ "got": body, "corr": corr }))
        }

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, Router::new().route("/echo", post(echo))).await.ok();
        });

        std::env::set_var("QuickcodeClients__WfTestApi", format!("http://{addr}/"));
        let yaml = r#"
kind: endpoint
steps:
  call:
    url: "{{QuickcodeClients.WfTestApi}}/echo"
    method: POST
    body:
      id: "{{input.id}}"
    transitions:
      - condition: call.statusCode == 200
        action: success
output:
  echoed: "{{call.response.got.id}}"
  corr: "{{call.response.corr}}"
  status: "{{call.statusCode}}"
"#;
        let res = run(yaml, json!({ "id": "abc" })).await;
        assert!(res.success, "steps: {:?}", res.steps);
        assert_eq!(
            res.output.unwrap(),
            json!({ "echoed": "abc", "corr": "corr-1", "status": 200 })
        );
    }

    #[tokio::test]
    async fn http_step_failure_status_without_transition_fails() {
        use axum::{http::StatusCode, routing::get, Router};

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(
                listener,
                Router::new().route("/bad", get(|| async { StatusCode::BAD_GATEWAY })),
            )
            .await
            .ok();
        });
        let yaml = format!("kind: endpoint\nsteps:\n  call:\n    url: http://{addr}/bad\n");
        let res = run(&yaml, json!({})).await;
        assert!(!res.success);
        assert_eq!(res.steps.get("call.statusCode"), Some(&json!(502)));
    }
}
