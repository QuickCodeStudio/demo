//! Generated OpenAPI dump for NSwag / Portal clients.
use std::path::PathBuf;

fn main() -> anyhow::Result<()> {
    let out = std::env::var("SWAGGER_OUT")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("swagger.json"));
    let doc = include_str!("swagger_openapi.json");
    if let Some(parent) = out.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&out, doc)?;
    eprintln!("Wrote OpenAPI to {}", out.display());
    Ok(())
}
