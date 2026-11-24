#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Created .env from .env.example — regenerate the project if JWT keys are missing."
  fi
fi

portal_port="$(grep -E '^PORTAL_PORT=' .env 2>/dev/null | tail -n1 | cut -d= -f2- || true)"
gateway_port="$(grep -E '^GATEWAY_PORT=' .env 2>/dev/null | tail -n1 | cut -d= -f2- || true)"
# Compose file lives in src/; without -p Docker names the project after the folder ("src").
compose_project="$(grep -E '^COMPOSE_PROJECT_NAME=' .env 2>/dev/null | tail -n1 | cut -d= -f2- || true)"
compose_project="${compose_project:-quickcode-demo-container}"

use_vm=""
if [[ "${1:-}" == "--vm" ]]; then
  use_vm=true
  shift
elif [[ "${1:-}" == "--local" ]]; then
  use_vm=false
  shift
elif [[ "${QUICKCODE_USE_VM_COMPOSE:-}" == "1" ]]; then
  use_vm=true
fi

has_vm_db=false
if [[ -f .env ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    val="${line#*=}"
    if [[ -n "$val" ]]; then
      has_vm_db=true
      break
    fi
  done < <(grep -E '^QUICKCODE_[A-Z0-9_]+_DB=' .env 2>/dev/null || true)
fi

if [[ -z "$use_vm" ]]; then
  if [[ -f docker-compose.vm.yml && "$has_vm_db" == true ]]; then
    use_vm=true
  else
    use_vm=false
  fi
fi

if [[ "$use_vm" == true ]]; then
  if [[ ! -f docker-compose.vm.yml ]]; then
    echo "docker-compose.vm.yml not found (needed for --vm)."
    exit 1
  fi
  echo "Using VM overlay (ASPNETCORE_ENVIRONMENT=Production)."
  docker compose -p "$compose_project" -f docker-compose.yml -f docker-compose.vm.yml --env-file .env up -d --build "$@"
else
  if [[ -f docker-compose.infra.yml ]]; then
    docker compose -p quickcode-local-infra -f docker-compose.infra.yml --env-file .env up -d
  else
    echo "docker-compose.infra.yml not in this site — expecting shared infra (quickcode-sql-data, …) already running."
  fi
  echo "Using local overlay (ASPNETCORE_ENVIRONMENT=Local / Development)."
  docker compose -p "$compose_project" --env-file .env up -d --build "$@"
fi

echo ""
echo "QuickCode stack (see .env for ports):"
echo "  Portal:  http://localhost:${portal_port:-6020}"
echo "  Gateway: http://localhost:${gateway_port:-6060}"
