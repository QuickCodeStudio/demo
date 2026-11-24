//! Map SQL result column names → Nest/OpenAPI camelCase JSON keys.

use serde_json::{Map, Value};

/// `BRAND_VIDEO` / `ID` / `IsDeleted` → `brandVideo` / `id` / `isDeleted`.
pub fn sql_key_to_camel(key: &str) -> String {
    let has_underscore = key.contains('_');
    let all_upper = !key.is_empty()
        && key
            .chars()
            .all(|c| !c.is_ascii_alphabetic() || c.is_ascii_uppercase());

    if has_underscore || all_upper {
        let mut parts = key.split('_').filter(|p| !p.is_empty());
        let Some(first) = parts.next() else {
            return String::new();
        };
        let mut out = first.to_ascii_lowercase();
        for part in parts {
            let mut chars = part.chars();
            if let Some(c) = chars.next() {
                out.extend(c.to_uppercase());
                out.extend(chars.flat_map(|ch| ch.to_lowercase()));
            }
        }
        return out;
    }

    let mut chars = key.chars();
    match chars.next() {
        None => String::new(),
        Some(f) => f.to_lowercase().collect::<String>() + chars.as_str(),
    }
}

pub fn row_to_api(row: Value) -> Value {
    match row {
        Value::Object(map) => {
            let mut out = Map::new();
            for (k, v) in map {
                out.insert(sql_key_to_camel(&k), v);
            }
            Value::Object(out)
        }
        other => other,
    }
}

pub fn rows_to_api(rows: Vec<Value>) -> Vec<Value> {
    rows.into_iter().map(row_to_api).collect()
}

/// Nest `scalarNumber` — first numeric cell from COUNT(*) / scalar query rows.
pub fn scalar_number(rows: &[Value]) -> i64 {
    let Some(row) = rows.first() else {
        return 0;
    };
    match row {
        Value::Number(n) => n.as_i64().or_else(|| n.as_u64().map(|u| u as i64)).unwrap_or(0),
        Value::Object(map) => map
            .values()
            .next()
            .map(value_as_i64)
            .unwrap_or(0),
        Value::Array(arr) => arr.first().map(value_as_i64).unwrap_or(0),
        _ => value_as_i64(row),
    }
}

/// Nest Exists filter — first cell as boolean.
pub fn scalar_bool(rows: &[Value]) -> bool {
    let Some(row) = rows.first() else {
        return false;
    };
    match row {
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_i64().unwrap_or(0) != 0,
        Value::Object(map) => map.values().next().map(value_as_bool).unwrap_or(false),
        Value::Array(arr) => arr.first().map(value_as_bool).unwrap_or(false),
        _ => value_as_bool(row),
    }
}

fn value_as_i64(v: &Value) -> i64 {
    match v {
        Value::Number(n) => n.as_i64().or_else(|| n.as_u64().map(|u| u as i64)).unwrap_or(0),
        Value::Bool(b) => {
            if *b {
                1
            } else {
                0
            }
        }
        Value::String(s) => s.parse().unwrap_or(0),
        _ => 0,
    }
}

fn value_as_bool(v: &Value) -> bool {
    match v {
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_i64().unwrap_or(0) != 0,
        Value::String(s) => {
            s == "1" || s.eq_ignore_ascii_case("true") || s.eq_ignore_ascii_case("yes")
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn scalar_number_reads_first_cell() {
        assert_eq!(scalar_number(&[json!({"COUNT": 8})]), 8);
        assert_eq!(scalar_number(&[json!(3)]), 3);
        assert_eq!(scalar_number(&[]), 0);
    }

    #[test]
    fn scalar_bool_reads_first_cell() {
        assert!(scalar_bool(&[json!({"x": 1})]));
        assert!(!scalar_bool(&[json!({"x": 0})]));
        assert!(scalar_bool(&[json!(true)]));
    }
}
