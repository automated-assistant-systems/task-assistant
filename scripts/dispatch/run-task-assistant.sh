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
#   --wait    (block until telemetry proves completion)
#
# Requires:
#   TELEMETRY_REPO env var when using --wait
#
# Usage:
#   ./scripts/dispatch/run-task-assistant.sh <owner/repo> --self-test [--wait]
#   ./scripts/dispatch/run-task-assistant.sh <owner/repo> --validate  [--wait]
#   ./scripts/dispatch/run-task-assistant.sh <owner/repo> --materialize [--wait]
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

# ------------------------------------------------------------
# Correlation (system-generated)
# - Must exist in THIS script (for --wait)
# - Must be passed to dispatch (so engines share it)
# ------------------------------------------------------------
CORRELATION_ID="$(date +%s)-$$"

echo "🚀 Task Assistant Dispatch"
echo "• Repo:          $REPO"
echo "• Action:        $ACTION"
echo "• Correlation:   $CORRELATION_ID"
echo "• Wait enabled:  $WAIT"
echo

# ------------------------------------------------------------
# Dispatch
# NOTE: dispatch workflow must accept correlation_id as an input
# ------------------------------------------------------------
gh workflow run task-assistant-dispatch.yml \
  --repo "$REPO" \
  -f mode="$ACTION" \
  -f correlation_id="$CORRELATION_ID" \
  >/dev/null

echo "✓ Dispatched $ACTION"

# ------------------------------------------------------------
# Optional wait: use telemetry as the completion signal
# ------------------------------------------------------------
if [[ "$WAIT" == "true" ]]; then
  : "${TELEMETRY_REPO:?TELEMETRY_REPO must be set for --wait (org/repo)}"

  echo
  echo "⏳ Waiting for $ACTION telemetry…"

  # telemetry paths use <repo> (not owner/repo) at the moment
  REPO_NAME="${REPO##*/}"
  DATE="$(date +%Y-%m-%d)"

  # Which file proves completion?
  # - materialize -> materialize.json
  # - validate    -> validate.json
  # - self-test   -> self-test.json (and optionally dashboard.json)
  ENGINE_FILE=""
  case "$ACTION" in
    materialize) ENGINE_FILE="materialize.json" ;;
    validate)    ENGINE_FILE="validate.json" ;;
    self-test)   ENGINE_FILE="self-test.json" ;;
    *)           ENGINE_FILE="${ACTION}.json" ;;
  esac

  EVENT_PATH="telemetry/v1/repos/${REPO_NAME}/${DATE}/${CORRELATION_ID}/${ENGINE_FILE}"

  for _ in {1..60}; do
    if gh api "repos/${TELEMETRY_REPO}/contents/${EVENT_PATH}" >/dev/null 2>&1; then
      echo "✅ $ACTION completed (telemetry observed)"
      exit 0
    fi
    sleep 2
  done

  echo "❌ Timed out waiting for telemetry: $EVENT_PATH"
  exit 1
fi
