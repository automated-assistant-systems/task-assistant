#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-}"

if [[ -z "$REPO" ]]; then
  echo "Usage: scripts/sandbox/reset-sandbox.sh <owner/repo>"
  exit 1
fi
scripts/sandbox/reset-sandbox.sh "$REPO"
scripts/sandbox/install-task-assistant.sh "$REPO"
scripts/validate/validate-workflows.sh "$REPO"
