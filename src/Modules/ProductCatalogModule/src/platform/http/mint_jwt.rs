use base64::Engine;
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

/// Nest/C# `createGatewayServiceToken` / `GatewayServiceTokenGenerator` claim shape.
#[derive(Serialize)]
struct Claims {
    sub: String,
    aud: String,
    iss: String,
    exp: usize,
    iat: usize,
    jti: String,
    #[serde(rename = "PermissionGroupName")]
    permission_group_name: String,
}

/// Mint a short-lived RS256 token for Kafka catalog / inter-module calls (P13).
///
/// `GATEWAY_JWT_PRIVATE_KEY` is base64-encoded PKCS#8 DER (same as Nest/C#), or a PEM string.
/// `jsonwebtoken`/`ring` sign via PKCS#1 DER extracted from PEM — wrap raw PKCS#8 DER as PEM first.
pub fn mint_catalog_token(audience: &str) -> anyhow::Result<String> {
    let key = encoding_key().ok_or_else(|| anyhow::anyhow!("GATEWAY_JWT_PRIVATE_KEY missing"))?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as usize;
    let ttl = std::env::var("GATEWAY_JWT_EXPIRATION_SECONDS")
        .ok()
        .and_then(|v| v.parse::<usize>().ok())
        .filter(|&v| v > 0)
        .unwrap_or(60);
    // Must match C#/Nest GatewayServiceTokenSettings.DefaultIssuer (`quickcode-gateway`).
    let issuer = std::env::var("GATEWAY_JWT_ISSUER")
        .or_else(|_| std::env::var("GatewayServiceTokenSettings__Issuer"))
        .unwrap_or_else(|_| "quickcode-gateway".into());
    let claims = Claims {
        sub: "gateway".into(),
        aud: audience.to_string(),
        iss: issuer,
        iat: now,
        exp: now + ttl,
        jti: Uuid::new_v4().to_string(),
        permission_group_name: "InternalService".into(),
    };
    Ok(encode(&Header::new(Algorithm::RS256), &claims, &key)?)
}

fn encoding_key() -> Option<EncodingKey> {
    let raw = std::env::var("GATEWAY_JWT_PRIVATE_KEY")
        .or_else(|_| std::env::var("QUICKCODE_GATEWAY_JWT_PRIVATE_KEY"))
        .ok()?;
    let raw = raw.trim();
    if raw.is_empty() {
        return None;
    }
    if raw.contains("BEGIN") {
        return EncodingKey::from_rsa_pem(raw.as_bytes()).ok();
    }
    let decoded = base64::engine::general_purpose::STANDARD
        .decode(raw)
        .ok()?;
    // Nest/C#: usually base64 PKCS#8 DER. Also accept base64 of PEM text.
    if let Ok(pem) = String::from_utf8(decoded.clone()) {
        if pem.contains("BEGIN") {
            return EncodingKey::from_rsa_pem(pem.as_bytes()).ok();
        }
    }
    let pem = wrap_pkcs8_der_as_pem(&decoded);
    EncodingKey::from_rsa_pem(pem.as_bytes()).ok()
}

fn wrap_pkcs8_der_as_pem(der: &[u8]) -> String {
    let b64 = base64::engine::general_purpose::STANDARD.encode(der);
    let mut out = String::from("-----BEGIN PRIVATE KEY-----\n");
    for chunk in b64.as_bytes().chunks(64) {
        out.push_str(std::str::from_utf8(chunk).unwrap_or(""));
        out.push('\n');
    }
    out.push_str("-----END PRIVATE KEY-----\n");
    out
}
