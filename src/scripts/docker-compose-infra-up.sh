#!/usr/bin/env bash
set -euo pipefail

# Starts the machine-wide SQL / Kafka / Elasticsearch stack (shared by every local site).
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
  fi
fi

if [[ ! -f docker-compose.infra.yml ]]; then
  echo "docker-compose.infra.yml not found."
  echo "Start shared infra from a generated site that includes it, or copy the TemplateBase file."
  exit 1
fi

docker compose -p quickcode-local-infra -f docker-compose.infra.yml --env-file .env up -d "$@"

echo ""
echo "Shared local infra is up (quickcode-sql-data, quickcode-kafka, quickcode-elasticsearch, …)."
echo "Host ports are in .env (5432 / 5433 / 9092 / 9200). Do not start a second copy from another site."
