#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Task Assistant — Run Materialize Repo Engine
#
# Operator convenience wrapper.
# Triggers the materialize engine via the dispatcher.
#
# This script:
#   • does NOT emit telemetry itself
#   • does NOT mutate infra
#   • relies on dispatch to generate correlation_id
#
# Usage:
#   scripts/dispatch/run-materialize-repo.sh <owner/repo>
#
# Example:
#   scripts/dispatch/run-materialize-repo.sh automated-assistant-systems/task-assistant
# ============================================================

TARGET_REPO="${1:-}"

if [[ -z "$TARGET_REPO" ]]; then
  echo "Usage: run-materialize-repo.sh <owner/repo>" >&2
  exit 1
fi

OWNER="${TARGET_REPO%%/*}"
REPO="${TARGET_REPO##*/}"

echo "🚀 Triggering materialize engine"
echo "• Repo: $OWNER/$REPO"
echo

gh workflow run task-assistant-dispatch.yml \
  --repo "$OWNER/$REPO" \
  -f mode=materialize

echo
echo "✓ Materialize workflow dispatched"
echo "→ Monitor with:"
echo "  gh run list --repo $OWNER/$REPO --workflow=task-assistant-dispatch.yml"
