#!/usr/bin/env bash
# Generate portal favicons from qc_icon_large.png.
#
# Usage (from generated project root or src/):
#   src/scripts/generate-favicons.sh
#   src/scripts/generate-favicons.sh --src path/to/qc_icon_large.png

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec python3 "$SCRIPT_DIR/generate-favicons.py" "$@"
