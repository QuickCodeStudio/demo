# Image is 1.88+ so crates.io MSRV (time/encoding_rs/icu) resolve; language target remains 1.85 (see Cargo.toml rust-version).
FROM rust:1.88-bookworm AS builder
WORKDIR /app

ARG MODULE_NAME=ProductCatalogModule

COPY src/Modules/${MODULE_NAME}/Cargo.toml src/Modules/${MODULE_NAME}/Cargo.lock* src/Modules/${MODULE_NAME}/
COPY src/Modules/${MODULE_NAME}/src src/Modules/${MODULE_NAME}/src
COPY src/Modules/${MODULE_NAME}/migrations src/Modules/${MODULE_NAME}/migrations
COPY src/Modules/${MODULE_NAME}/sql src/Modules/${MODULE_NAME}/sql
COPY src/Modules/${MODULE_NAME}/workflows src/Modules/${MODULE_NAME}/workflows

WORKDIR /app/src/Modules/${MODULE_NAME}
ENV CARGO_RESOLVER_INCOMPATIBLE_RUST_VERSIONS=fallback
RUN cargo build --release --bin api --bin swagger-dump

FROM debian:bookworm-slim AS production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

ENV PORT=80
ENV RUN_MIGRATION=yes
ENV RUST_LOG=info

ARG MODULE_NAME=ProductCatalogModule
ENV ENDPOINT_WORKFLOWS_PATH=/app/workflows/generated-endpoint-workflows.json

COPY --from=builder /app/src/Modules/${MODULE_NAME}/target/release/api /app/api
COPY --from=builder /app/src/Modules/${MODULE_NAME}/migrations /app/migrations
COPY --from=builder /app/src/Modules/${MODULE_NAME}/sql /app/sql
COPY --from=builder /app/src/Modules/${MODULE_NAME}/workflows /app/workflows

EXPOSE 80
CMD ["/app/api"]
