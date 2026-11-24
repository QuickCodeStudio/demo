use serde_json::Value;
use std::collections::HashMap;

const SENSITIVE: &[&str] = &[
    "password",
    "passwd",
    "token",
    "secret",
    "authorization",
    "refreshToken",
    "accessToken",
    "clientSecret",
    "apiKey",
    "privateKey",
];

pub fn redact_sensitive(mut value: Value) -> Value {
    match &mut value {
        Value::Object(map) => {
            for (k, v) in map.iter_mut() {
                if is_sensitive_key(k) {
                    *v = Value::String("***".into());
                } else {
                    *v = redact_sensitive(v.clone());
                }
            }
        }
        Value::Array(arr) => {
            for item in arr.iter_mut() {
                *item = redact_sensitive(item.clone());
            }
        }
        _ => {}
    }
    value
}

pub fn redact_headers(headers: HashMap<String, Value>) -> HashMap<String, Value> {
    headers
        .into_iter()
        .map(|(k, v)| {
            if is_sensitive_key(&k) {
                (k, Value::String("***".into()))
            } else {
                (k, v)
            }
        })
        .collect()
}

fn is_sensitive_key(k: &str) -> bool {
    let lower = k.to_lowercase().replace(['_', '-', ' '], "");
    SENSITIVE.iter().any(|s| {
        let s = s.to_lowercase().replace(['_', '-', ' '], "");
        lower == s || lower.contains(&s)
    })
}
