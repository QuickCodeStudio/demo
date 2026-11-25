# QuickCode context snapshot

This folder is a **regenerable dump** of the active project/module context from QuickCode DB
(`PROJECT_CONTEXTS` / `MODULE_CONTEXTS`). It is **not** the source of truth.

- Written for IDE agents (Cursor, Claude, etc.) so they can skim domain intent, modules, and boundaries.
- **Entire folder is deleted and rewritten** on every successful generate for `demo`.
- Do not hand-edit; changes here will be lost on the next generate.
- Prefer live Studio/API context and DBML/OpenAPI for authoritative schema and contracts.
- Companion OpenAPI snapshot: `../api/` (copied from `src/swagger_files` at generate time).
- GitHub Actions ignore this path (`paths-ignore: .quickcode/**`) so context-only commits do not deploy.

## Layout

| File | Contents |
|------|----------|
| `manifest.json` | Index of this export |
| `project-context.json` | Active project context + payload |
| `modules/*.json` | One file per active module context |
