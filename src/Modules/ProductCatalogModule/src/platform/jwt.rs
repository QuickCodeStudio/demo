use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::middleware::Next;
use axum::response::Response;
use base64::Engine;
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct Claims {
    #[serde(default)]
    sub: String,
    #[serde(default)]
    aud: serde_json::Value,
}

fn public_key_pem() -> Option<String> {
    let raw = std::env::var("GATEWAY_JWT_PUBLIC_KEY").ok()?;
    if raw.trim().is_empty() {
        return None;
    }
    if raw.contains("BEGIN") {
        return Some(raw);
    }
    let decoded = base64::engine::general_purpose::STANDARD
        .decode(raw.trim())
        .ok()?;
    String::from_utf8(decoded).ok()
}

fn audience() -> String {
    std::env::var("MODULE_NAME").unwrap_or_else(|_| "Template0ModuleName".into())
}

fn aud_matches(claims_aud: &serde_json::Value, expected: &str) -> bool {
    match claims_aud {
        serde_json::Value::String(s) => s == expected,
        serde_json::Value::Array(arr) => arr.iter().any(|v| v.as_str() == Some(expected)),
        _ => false,
    }
}

pub async fn gateway_jwt(req: Request<Body>, next: Next) -> Response {
    let path = req.uri().path();
    if crate::auditing::is_health_path(path) || path.starts_with("/swagger") {
        return next.run(req).await;
    }

    let Some(pem) = public_key_pem() else {
        return next.run(req).await;
    };

    let auth = req
        .headers()
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let token = auth.strip_prefix("Bearer ").unwrap_or("");
    if token.is_empty() {
        return crate::platform::problem::problem_json(
            StatusCode::UNAUTHORIZED,
            "Missing bearer token",
        );
    }

    let Ok(key) = DecodingKey::from_rsa_pem(pem.as_bytes()) else {
        return crate::platform::problem::problem_json(
            StatusCode::UNAUTHORIZED,
            "Invalid gateway public key",
        );
    };
    let expected_aud = audience();
    let mut validation = Validation::new(Algorithm::RS256);
    validation.validate_exp = true;
    // Validate audience manually so both string and array `aud` work.
    validation.validate_aud = false;
    match decode::<Claims>(token, &key, &validation) {
        Ok(data) if aud_matches(&data.claims.aud, &expected_aud) => next.run(req).await,
        Ok(_) => crate::platform::problem::problem_json(
            StatusCode::UNAUTHORIZED,
            "Invalid token audience",
        ),
        Err(_) => {
            crate::platform::problem::problem_json(StatusCode::UNAUTHORIZED, "Invalid token")
        }
    }
}
