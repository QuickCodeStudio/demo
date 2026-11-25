use axum::middleware::{from_fn, from_fn_with_state};
use axum::Router;
use quickcode_module::db;
use quickcode_module::generated_router;
use quickcode_module::platform::{self, AppState};
use quickcode_module::platform::kafka::{kafka_publish, start_kafka_publisher};
use quickcode_module::platform::observability::{shutdown_observability, start_observability};
use std::net::SocketAddr;
use tower_http::compression::CompressionLayer;
use tower_http::trace::TraceLayer;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    if std::env::var_os("MODULE_NAME").is_none() {
        // Template token — CopyFiles replaces Template0ModuleName with the real module.
        std::env::set_var("MODULE_NAME", "Template0ModuleName");
    }

    let module_name = std::env::var("MODULE_NAME").unwrap_or_else(|_| "Template0ModuleName".into());
    // Cloud Run often has only READ_CONNECTION_STRING (C# ADO) — map to DB_* first.
    db::apply_connection_string_env_fallback();
    // Nest: startObservability before listen — installs fmt + OTLP (P15).
    start_observability(&format!("QuickCode.{module_name}.Api"));
    start_kafka_publisher();

    // Same order as C# / Nest: provision DB → migrate → seed → listen
    db::ensure_database_exists().await?;
    db::run_quickcode_sql_migrations().await?;
    db::run_quickcode_seed_data().await?;

    let pool = db::create_pool().await?;
    let state = AppState::new(pool);

    // Merge all AppState routers BEFORE with_state (axum 0.8).
    let mut app = Router::new()
        .merge(platform::health_routes())
        .merge(platform::metrics_routes())
        .merge(generated_router::build_router());

    if std::env::var("SWAGGER_DUMP").ok().as_deref() != Some("1") {
        app = app.merge(platform::swagger_routes());
    }

    // Middleware order (Nest parity): headers → rate limit → api log → JWT → endpoint workflows → audit → kafka publish
    // (first .layer = innermost / closest to handlers)
    let app = app
        .layer(from_fn(kafka_publish))
        .layer(from_fn_with_state(
            state.clone(),
            quickcode_module::auditing::security_audit,
        ))
        // C# UseModuleEndpointWorkflows — after auth, before routed handlers
        .layer(from_fn_with_state(
            state.clone(),
            platform::endpoint_workflows,
        ))
        .layer(from_fn(platform::gateway_jwt))
        .layer(from_fn(platform::api_log))
        .layer(from_fn(platform::rate_limit))
        .layer(from_fn(platform::security_headers))
        .layer(from_fn(platform::problem_details_layer))
        .layer(from_fn(platform::rewrite_swagger_index))
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .layer(platform::build_cors())
        .with_state(state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(80);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("{module_name} API listening on {port}");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    shutdown_observability();
    Ok(())
}
