//! In-process index of generated endpoint workflows (path + method → YAML).
//! Nest `EndpointWorkflowRegistry` / C# `ModuleEndpointWorkflowRegistry` parity.

use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tracing::{error, info};

use super::types::{EndpointWorkflowEntry, ENDPOINT_WORKFLOW_DEFAULT_PATH};

/// `{id}`, `{id:int}`, `{id?}`, `{*rest}` — a whole path segment.
static PARAM_SEGMENT: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^\{\*?([A-Za-z_]\w*)(?::[^}?]*)?(\?)?\}$").expect("param segment regex"));

struct TemplateRoute {
    regex: Regex,
    names: Vec<String>,
    entry: Arc<EndpointWorkflowEntry>,
}

#[derive(Default)]
struct MethodBucket {
    exact: HashMap<String, Arc<EndpointWorkflowEntry>>,
    templates: Vec<TemplateRoute>,
}

#[derive(Clone)]
pub struct EndpointWorkflowMatch {
    pub entry: Arc<EndpointWorkflowEntry>,
    pub path_parameters: HashMap<String, String>,
}

#[derive(Default)]
pub struct EndpointWorkflowRegistry {
    by_method: HashMap<String, MethodBucket>,
    count: usize,
}

/// Query-less, single leading slash, no trailing slash (root stays `/`); case is preserved.
pub fn normalize_workflow_path(path: &str) -> String {
    let no_query = path.split('?').next().unwrap_or("").trim();
    format!("/{}", no_query.trim_matches('/'))
}

/// `/api/orders/{id}` → case-insensitive regex + param names.
fn compile_template(template: &str) -> Option<(Regex, Vec<String>)> {
    let mut names = Vec::new();
    let mut pattern = String::new();
    // Not `normalize_workflow_path`: its query stripping would eat the `?` of `{id?}`.
    for segment in template.trim().split('/').filter(|s| !s.is_empty()) {
        if let Some(caps) = PARAM_SEGMENT.captures(segment) {
            names.push(caps[1].to_string());
            if caps.get(2).is_some() {
                pattern.push_str("(?:/([^/]+))?");
            } else {
                pattern.push_str("/([^/]+)");
            }
        } else {
            pattern.push('/');
            pattern.push_str(&regex::escape(segment));
        }
    }
    Regex::new(&format!("(?i)^{pattern}/?$"))
        .ok()
        .map(|re| (re, names))
}

fn percent_decode(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let hi = (bytes[i + 1] as char).to_digit(16);
            let lo = (bytes[i + 2] as char).to_digit(16);
            if let (Some(hi), Some(lo)) = (hi, lo) {
                out.push((hi * 16 + lo) as u8);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8(out).unwrap_or_else(|_| value.to_string())
}

impl EndpointWorkflowRegistry {
    pub fn empty() -> Self {
        Self::default()
    }

    pub fn from_entries(entries: Vec<EndpointWorkflowEntry>) -> Self {
        let mut registry = Self::default();
        registry.register(entries);
        registry
    }

    /// Reads the generated JSON registry. Path: `ENDPOINT_WORKFLOWS_PATH`, else `<cwd>/workflows/generated-endpoint-workflows.json`.
    pub fn load_from_env() -> Self {
        let target = std::env::var("ENDPOINT_WORKFLOWS_PATH")
            .ok()
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty())
            .map(PathBuf::from)
            .unwrap_or_else(|| {
                std::env::current_dir()
                    .unwrap_or_default()
                    .join(ENDPOINT_WORKFLOW_DEFAULT_PATH)
            });
        Self::load_from_file(&target)
    }

    pub fn load_from_file(path: &std::path::Path) -> Self {
        if !path.exists() {
            return Self::empty();
        }
        let raw = match std::fs::read_to_string(path) {
            Ok(raw) => raw,
            Err(e) => {
                error!("Failed to read endpoint workflows from {}: {e}", path.display());
                return Self::empty();
            }
        };
        let raw = raw.trim();
        if raw.is_empty() {
            return Self::empty();
        }
        match serde_json::from_str::<Vec<EndpointWorkflowEntry>>(raw) {
            Ok(entries) => {
                let registry = Self::from_entries(entries);
                info!(
                    "Loaded {} endpoint workflow(s) from {}",
                    registry.len(),
                    path.display()
                );
                registry
            }
            Err(e) => {
                error!("Failed to parse endpoint workflows from {}: {e}", path.display());
                Self::empty()
            }
        }
    }

    pub fn len(&self) -> usize {
        self.count
    }

    pub fn is_empty(&self) -> bool {
        self.count == 0
    }

    /// Rebuilds the index; inactive / incomplete entries are skipped (C# EndpointWorkflowIndex.From).
    pub fn register(&mut self, entries: Vec<EndpointWorkflowEntry>) {
        let mut index: HashMap<String, MethodBucket> = HashMap::new();
        let mut count = 0;
        for entry in entries {
            if !entry.is_active
                || entry.endpoint_path.trim().is_empty()
                || entry.http_method.trim().is_empty()
                || entry.workflow_content.trim().is_empty()
            {
                continue;
            }
            let method = entry.http_method.trim().to_uppercase();
            let bucket = index.entry(method).or_default();
            let entry = Arc::new(entry);
            if entry.endpoint_path.contains('{') {
                let Some((regex, names)) = compile_template(&entry.endpoint_path) else {
                    error!(
                        "Endpoint workflow {}: invalid path template {}",
                        entry.name, entry.endpoint_path
                    );
                    continue;
                };
                bucket.templates.push(TemplateRoute { regex, names, entry });
            } else {
                bucket.exact.insert(
                    normalize_workflow_path(&entry.endpoint_path).to_lowercase(),
                    entry,
                );
            }
            count += 1;
        }
        self.by_method = index;
        self.count = count;
    }

    /// Exact match first (case-insensitive), then `{param}` templates in registration order.
    pub fn find(&self, http_method: &str, path: &str) -> Option<EndpointWorkflowMatch> {
        if path.is_empty() || http_method.is_empty() {
            return None;
        }
        let bucket = self.by_method.get(&http_method.to_uppercase())?;
        let normalized = normalize_workflow_path(path);

        if let Some(entry) = bucket.exact.get(&normalized.to_lowercase()) {
            return Some(EndpointWorkflowMatch {
                entry: entry.clone(),
                path_parameters: HashMap::new(),
            });
        }

        for route in &bucket.templates {
            let Some(caps) = route.regex.captures(&normalized) else {
                continue;
            };
            let mut path_parameters = HashMap::new();
            for (i, name) in route.names.iter().enumerate() {
                if let Some(m) = caps.get(i + 1) {
                    path_parameters.insert(name.clone(), percent_decode(m.as_str()));
                }
            }
            return Some(EndpointWorkflowMatch {
                entry: route.entry.clone(),
                path_parameters,
            });
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(path: &str, method: &str, name: &str) -> EndpointWorkflowEntry {
        EndpointWorkflowEntry {
            name: name.into(),
            module_name: "OrderModule".into(),
            endpoint_path: path.into(),
            http_method: method.into(),
            description: None,
            workflow_content: "kind: endpoint\nname: wf\n".into(),
            is_active: true,
        }
    }

    #[test]
    fn normalizes_paths() {
        assert_eq!(normalize_workflow_path("/a/b/"), "/a/b");
        assert_eq!(normalize_workflow_path("a/b?x=1"), "/a/b");
        assert_eq!(normalize_workflow_path("///"), "/");
        assert_eq!(normalize_workflow_path(""), "/");
    }

    #[test]
    fn matches_exact_path_case_insensitively_ignoring_trailing_slash() {
        let reg = EndpointWorkflowRegistry::from_entries(vec![entry(
            "/api/order-module/place-order",
            "POST",
            "wf",
        )]);
        assert_eq!(reg.len(), 1);
        for (method, path) in [
            ("POST", "/api/order-module/place-order"),
            ("post", "/API/Order-Module/Place-Order/"),
            ("POST", "api/order-module/place-order"),
        ] {
            let hit = reg.find(method, path).expect("exact match");
            assert_eq!(hit.entry.name, "wf");
            assert!(hit.path_parameters.is_empty());
        }
    }

    #[test]
    fn does_not_match_other_method_or_path() {
        let reg = EndpointWorkflowRegistry::from_entries(vec![entry(
            "/api/order-module/place-order",
            "POST",
            "wf",
        )]);
        assert!(reg.find("GET", "/api/order-module/place-order").is_none());
        assert!(reg.find("POST", "/api/order-module/other").is_none());
        assert!(reg.find("POST", "/api/order-module/place-order/extra").is_none());
        assert!(reg.find("POST", "").is_none());
    }

    #[test]
    fn matches_param_templates_and_extracts_parameters() {
        let reg = EndpointWorkflowRegistry::from_entries(vec![entry(
            "/api/orders/{orderId}/items/{itemId:int}",
            "GET",
            "tpl",
        )]);
        let hit = reg.find("GET", "/api/orders/42/items/7").expect("template match");
        assert_eq!(hit.entry.name, "tpl");
        assert_eq!(hit.path_parameters.get("orderId").map(String::as_str), Some("42"));
        assert_eq!(hit.path_parameters.get("itemId").map(String::as_str), Some("7"));

        // Case-insensitive literals, trailing slash, percent-decoding.
        let hit = reg
            .find("get", "/API/Orders/a%20b/ITEMS/9/")
            .expect("template match");
        assert_eq!(hit.path_parameters.get("orderId").map(String::as_str), Some("a b"));

        assert!(reg.find("GET", "/api/orders/42/items").is_none());
        assert!(reg.find("GET", "/api/orders/42/items/7/more").is_none());
        assert!(reg.find("POST", "/api/orders/42/items/7").is_none());
    }

    #[test]
    fn exact_match_wins_over_template() {
        let reg = EndpointWorkflowRegistry::from_entries(vec![
            entry("/api/orders/{id}", "GET", "tpl"),
            entry("/api/orders/latest", "GET", "exact"),
        ]);
        assert_eq!(reg.find("GET", "/api/orders/latest").unwrap().entry.name, "exact");
        assert_eq!(reg.find("GET", "/api/orders/5").unwrap().entry.name, "tpl");
    }

    #[test]
    fn optional_param_segment() {
        let reg = EndpointWorkflowRegistry::from_entries(vec![entry("/api/list/{page?}", "GET", "opt")]);
        let with = reg.find("GET", "/api/list/3").expect("with param");
        assert_eq!(with.path_parameters.get("page").map(String::as_str), Some("3"));
        let without = reg.find("GET", "/api/list").expect("without param");
        assert!(without.path_parameters.is_empty());
    }

    #[test]
    fn skips_inactive_and_incomplete_entries() {
        let mut inactive = entry("/a", "GET", "inactive");
        inactive.is_active = false;
        let mut no_content = entry("/b", "GET", "nocontent");
        no_content.workflow_content = "  ".into();
        let no_method = entry("/c", "", "nomethod");
        let reg = EndpointWorkflowRegistry::from_entries(vec![inactive, no_content, no_method]);
        assert!(reg.is_empty());
        assert!(reg.find("GET", "/a").is_none());
    }

    #[test]
    fn parses_emitter_json() {
        let json = r#"[{"name":"W","moduleName":"M","endpointPath":"/api/x/{id}","httpMethod":"get","description":null,"workflowContent":"kind: endpoint","isActive":true}]"#;
        let entries: Vec<EndpointWorkflowEntry> = serde_json::from_str(json).unwrap();
        let reg = EndpointWorkflowRegistry::from_entries(entries);
        assert_eq!(reg.find("GET", "/api/x/1").unwrap().entry.name, "W");
    }
}
