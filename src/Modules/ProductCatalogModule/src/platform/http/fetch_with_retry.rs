use std::time::Duration;

fn should_retry(status: reqwest::StatusCode) -> bool {
    status.is_server_error()
        || status == reqwest::StatusCode::REQUEST_TIMEOUT
        || status == reqwest::StatusCode::TOO_MANY_REQUESTS
}

/// Nest / Polly WaitAndRetry parity for outbound HTTP.
pub async fn fetch_with_retry(
    mut build: impl FnMut() -> reqwest::RequestBuilder,
    retries: u32,
    base_delay_ms: u64,
) -> Result<reqwest::Response, reqwest::Error> {
    let mut last_err = None;
    for attempt in 0..=retries {
        match build().send().await {
            Ok(res) if should_retry(res.status()) && attempt < retries => {
                tokio::time::sleep(Duration::from_millis(base_delay_ms * 2u64.pow(attempt))).await;
            }
            Ok(res) => return Ok(res),
            Err(e) if attempt < retries => {
                last_err = Some(e);
                tokio::time::sleep(Duration::from_millis(base_delay_ms * 2u64.pow(attempt))).await;
            }
            Err(e) => return Err(e),
        }
    }
    Err(last_err.expect("retry loop"))
}
