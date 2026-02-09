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

REPO_NAME="${REPO##*/}"

ACTION=""
WAIT="false"

if [[ -z "${GH_TOKEN:-}" ]]; then
  if command -v gh >/dev/null 2>&1; then
    GH_TOKEN="$(gh auth token 2>/dev/null || true)"
    export GH_TOKEN
  fi
fi

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "❌ GH_TOKEN is required (run: gh auth login)"
  exit 1
fi

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

case "$ACTION" in
  materialize)
    EXPECTED_ENGINE="materialize"
    ;;
  validate)
    EXPECTED_ENGINE="validate"
    ;;
  self-test)
    EXPECTED_ENGINE="dashboard"
    ;;
  *)
    echo "❌ Unsupported action: $ACTION" >&2
    exit 1
    ;;
esac

EXPECTED_FILE="${EXPECTED_ENGINE}.json"

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
echo "• Repo:           $REPO"
echo "• Action:         $ACTION"
echo "• Correlation:    $CORRELATION_ID"
echo "• Wait enabled:   $WAIT"
echo

# ------------------------------------------------------------
# Dispatch
# NOTE: dispatch workflow must accept correlation_id as an input
# ------------------------------------------------------------
MAX_RETRIES=3
RETRY_DELAY=3

for attempt in $(seq 1 $MAX_RETRIES); do
  if gh workflow run task-assistant-dispatch.yml \
       --repo "$REPO" \
       -f mode="$ACTION" \
       >/dev/null; then
    echo "✓ Dispatched $ACTION"
    break
  fi

  if [[ "$attempt" -eq "$MAX_RETRIES" ]]; then
    echo "❌ Failed to dispatch $ACTION after $MAX_RETRIES attempts" >&2
    exit 1
  fi

  echo "⚠️  Dispatch failed (attempt $attempt), retrying in ${RETRY_DELAY}s…"
  sleep "$RETRY_DELAY"
done

echo "✓ Dispatched $ACTION"

# ------------------------------------------------------------
# Optional wait: use telemetry as the completion signal
# ------------------------------------------------------------
if [[ "$WAIT" == "true" ]]; then

  echo "🔎 Resolving telemetry repository via infra…"

  TELEMETRY_REPO="$(
    node -e '
      import { resolveInfraForRepo } from "./lib/infra.js";

      const repo = process.argv[1];
      const token = process.env.GH_TOKEN;

      if (!repo) {
        console.error("Missing target repo");
        process.exit(1);
      }
      if (!token) {
        console.error("GH_TOKEN not set");
        process.exit(1);
      }

      const result = await resolveInfraForRepo({
        targetRepo: repo,
        githubToken: token,
      });

      if (!result?.telemetryRepo) {
        console.error("Failed to resolve telemetry repo");
        process.exit(1);
      }

      process.stdout.write(result.telemetryRepo);
     ' "$REPO"
  )"

  echo
  echo "⏳ Waiting for ${EXPECTED_ENGINE} telemetry…"

  FOUND_DATE=""

  for _ in {1..90}; do
    # list date directories (telemetry is date-partitioned)
    for DATE in $(
      gh api "repos/$TELEMETRY_REPO/contents/telemetry/v1/repos/$REPO_NAME" \
        --jq '.[] | select(.type=="dir") | .name' 2>/dev/null
    ); do
      if gh api \
        "repos/$TELEMETRY_REPO/contents/telemetry/v1/repos/$REPO_NAME/$DATE/$CORRELATION_ID/$EXPECTED_FILE" \
        >/dev/null 2>&1; then
        FOUND_DATE="$DATE"
        break 2
      fi
    done
    sleep 2
  done

  if [[ -z "$FOUND_DATE" ]]; then
    echo "❌ Timed out waiting for ${EXPECTED_FILE}" >&2
    exit 1
  fi

  echo "✅ ${ACTION} completed (${EXPECTED_FILE})"

fi
