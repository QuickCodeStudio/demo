use axum::body::Body;
use axum::http::{header, HeaderValue, Request};
use axum::middleware::Next;
use axum::response::Response;

use super::swagger::is_swagger_path;

/// Nest / C# SecurityHeadersMiddleware parity (Gateway CSP allows jsDelivr for Swagger UI).
pub async fn security_headers(req: Request<Body>, next: Next) -> Response {
    let path = req.uri().path().to_string();
    let swagger = is_swagger_path(&path);
    let mut res = next.run(req).await;
    let headers = res.headers_mut();

    insert(
        headers,
        "strict-transport-security",
        "max-age=31536000; includeSubDomains; preload",
    );
    headers.insert(header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));
    // SAMEORIGIN: Gateway dashboard iframes Swagger through YARP.
    headers.insert(header::X_FRAME_OPTIONS, HeaderValue::from_static("SAMEORIGIN"));
    insert(headers, "x-xss-protection", "1; mode=block");
    insert(headers, "referrer-policy", "strict-origin-when-cross-origin");
    insert(
        headers,
        "permissions-policy",
        "geolocation=(), microphone=(), camera=(), payment=()",
    );
    insert(
        headers,
        "content-security-policy",
        "default-src 'self'; \
         script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: \
         https://ajax.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net \
         https://gitcdn.github.io https://code.jquery.com; \
         style-src 'self' 'unsafe-inline' \
         https://fonts.googleapis.com https://cdnjs.cloudflare.com https://gitcdn.github.io \
         https://cdn.jsdelivr.net; \
         font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com \
         https://cdn.jsdelivr.net; \
         img-src 'self' data: blob: https:; \
         worker-src 'self' blob:; \
         child-src 'self' blob:; \
         connect-src 'self'; \
         frame-src 'self' http://localhost:* https://localhost:* https://*.quickcode.net \
         https://*.europe-west1.run.app; \
         frame-ancestors 'self'",
    );
    insert(headers, "x-permitted-cross-domain-policies", "none");
    insert(headers, "x-download-options", "noopen");
    insert(headers, "x-dns-prefetch-control", "off");

    // Swagger UI blob workers fail under COEP require-corp when iframed by Gateway.
    if !swagger {
        insert(headers, "cross-origin-embedder-policy", "require-corp");
        insert(headers, "cross-origin-opener-policy", "same-origin");
        insert(headers, "cross-origin-resource-policy", "same-origin");
    }

    res
}

fn insert(
    headers: &mut axum::http::HeaderMap,
    name: &'static str,
    value: &'static str,
) {
    if let (Ok(n), Ok(v)) = (
        header::HeaderName::from_bytes(name.as_bytes()),
        HeaderValue::from_str(value),
    ) {
        headers.insert(n, v);
    }
}
