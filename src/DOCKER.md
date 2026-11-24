# Docker Compose & Rider

Open **`QuickCode.Demo.sln`** in Rider (from the `src/` folder).

## First-time setup

```bash
./scripts/rider-docker-setup.sh
```

This configures Docker for Mac (`unix:///var/run/docker.sock`), ensures `.env` exists, and removes stale Rider debug override files.

SQL, Kafka, and Elasticsearch are **shared** across every generated site on this machine (`docker-compose.infra.yml`, compose project `quickcode-local-infra`). App containers (gateway / portal / APIs) are per site.

## Run vs Debug (full stack)

| Button | Behavior |
|--------|----------|
| **Run** (▶) | Starts shared infra (if needed) then this site's apps |
| **Debug** (🐛) on **QuickCode Docker Compose** | Same, plus Rider fast-mode debugger on .NET services |

Set breakpoints, then Debug. For host-side debugging with infra in Docker, use a **Local Debug** compound config.

## Run configurations

| Config | Purpose |
|--------|---------|
| **QuickCode Docker Compose** | Shared infra (CLI) then this site's apps (compound) |
| **QuickCode Docker Apps** | Apps only — requires infra already running |
| **Docker Compose Up (CLI)** | Same via shell script (no Docker plugin server) |
| **Docker Infra Only (CLI)** | Shared SQL / Kafka / Elasticsearch only (once per machine) |
| **Local Debug Portal** | Infra in Docker + Portal on host |
| **Local Debug Gateway** | Infra in Docker + Gateway on host (`http` profile) |

## CLI

```bash
./scripts/docker-compose-up.sh
```

Starts `quickcode-local-infra` first, then this site's app compose project (`docker-compose.override.yml`, environment **Local**). VM / Production overlay is only used with `./scripts/docker-compose-up.sh --vm` or when `QUICKCODE_*_DB` is set in `.env`.

## Services

| Service | URL (demo / slot 0) |
|---------|----------------|
| Portal | http://localhost:6220 |
| Gateway | http://localhost:6260 |

A second generated site uses the next slot (`+100`, see `COMPOSE_PORT_SLOT` in `src/.env`). Infra ports (5432, 5433, 9092, 9200) stay the same.

## Troubleshooting

- **Services shows 🚫 Compose: docker-compose.yml / Debug does nothing:** That Services node is not the run config. Use the top toolbar dropdown → **QuickCode Docker Compose** → Debug (or **Local Debug Portal**). Do not Debug from the red Compose node.
- **Compose project is named `src`:** `docker compose` was run from the `src/` folder without `-p`. Use `./scripts/docker-compose-up.sh` (project `quickcode-*-container`). Remove the stray stack with `docker compose -p src down`.
- **`WriteConnectionString` is not configured / Started(Production):** the VM overlay was used (`docker-compose.vm.yml`). Recreate with `./scripts/docker-compose-up.sh --local` so apps load `appsettings.Local.json`.
- **Swagger fetch error:** A container is down — check **Services** tool window or `docker compose ps`.
- **Server Docker not found:** Re-run setup, or **Settings → Build, Execution, Deployment → Docker → + → Docker for Mac**.
