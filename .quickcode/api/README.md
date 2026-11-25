# QuickCode OpenAPI snapshot

This folder is a **regenerable copy** of OpenAPI JSON from `src/swagger_files/`
(produced by module Api PostBuild `dotnet swagger tofile`). It is **not** the source of truth.

- Written for IDE agents (Cursor, Claude, etc.) building mobile/web clients against this backend.
- **Entire folder is deleted and rewritten** on every successful generate for `demo`.
- `src/swagger_files/*.json` stays gitignored; only this snapshot is meant for GitHub.
- Local or CI builds refresh `swagger_files` only — this folder stays until the next generate.
- GitHub Actions ignore `.quickcode/**` so API-snapshot-only commits do not deploy.

## Layout

| File | Contents |
|------|----------|
| `manifest.json` | Index of copied specs |
| `*-Swagger.json` | OpenAPI documents (module Api / gateway as available) |
