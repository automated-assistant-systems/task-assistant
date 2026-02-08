#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Task Assistant — Unified Dispatch Script
#
# Supported actions:
#   --self-test
#   --validate
#   --materialize
#
# Optional:
#   --wait    (block until workflow completes)
#
# Usage:
#   run-task-assistant.sh <owner/repo> --self-test [--wait]
#   run-task-assistant.sh <owner/repo> --validate  [--wait]
#   run-task-assistant.sh <owner/repo> --materialize [--wait]
# ============================================================

REPO="${1:-}"
shift || true

ACTION=""
WAIT="false"

for arg in "$@"; do
  case "$arg" in
    --self-test)    ACTION="self-test" ;;
    --validate)     ACTION="validate" ;;
    --materialize)  ACTION="materialize" ;;
    --wait)         WAIT="true" ;;
    *)
      echo "❌ Unknown flag: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$REPO" || -z "$ACTION" ]]; then
  echo "Usage:"
  echo "  run-task-assistant.sh <owner/repo> --self-test [--wait]"
  echo "  run-task-assistant.sh <owner/repo> --validate  [--wait]"
  echo "  run-task-assistant.sh <owner/repo> --materialize [--wait]"
  exit 1
fi

CORRELATION_ID="${GITHUB_RUN_ID:-$(date +%s)}-$$"

echo "🚀 Task Assistant Dispatch"
echo "• Repo:          $REPO"
echo "• Action:        $ACTION"
echo "• Correlation:   $CORRELATION_ID"
echo "• Wait enabled:  $WAIT"
echo

# ------------------------------------------------------------
# Dispatch workflow
# ------------------------------------------------------------
gh workflow run task-assistant-dispatch.yml \
  --repo "$REPO" \
  -f mode="$ACTION" \
  >/dev/null

echo "✓ Dispatched $ACTION"

# ------------------------------------------------------------
# Optional wait
# ------------------------------------------------------------
if [[ "$WAIT" == "true" ]]; then
  echo
  echo "⏳ Waiting for workflow completion…"

  RUN_ID=""
  for _ in {1..12}; do
    RUN_ID="$(gh run list \
      --repo "$REPO" \
      --workflow task-assistant-dispatch.yml \
      --json databaseId,status \
      -q '.[] | select(.status=="in_progress") | .databaseId' \
      | head -n 1)"
    [[ -n "$RUN_ID" ]] && break
    sleep 2
  done

  if [[ -z "$RUN_ID" ]]; then
    echo "❌ Could not locate running workflow" >&2
    exit 1
  fi

  gh run watch "$RUN_ID" --exit-status
  echo "✅ $ACTION completed"
fi
