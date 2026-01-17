#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Required common env
# ─────────────────────────────────────────────
: "${ENGINE_NAME:?Missing ENGINE_NAME}"
: "${ENGINE_JOB:?Missing ENGINE_JOB}"
: "${CORRELATION_ID:?Missing CORRELATION_ID}"

# Optional
SUMMARY_ONLY="${SUMMARY_ONLY:-false}"
RESULT_FILE="${RESULT_FILE:-}"

# Repo context (required for telemetry routing)
: "${OWNER:?Missing OWNER}"
: "${TELEMETRY_REPO:?Missing TELEMETRY_REPO}"

# Token (required for write)
if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "::error::telemetry: GH_TOKEN is not set"
  exit 1
fi

# ─────────────────────────────────────────────
# Build payload
# ─────────────────────────────────────────────
if [[ "$SUMMARY_ONLY" == "true" ]]; then
  PAYLOAD=$(jq -n \
    --arg engine "$ENGINE_NAME" \
    --arg job "$ENGINE_JOB" \
    --arg cid "$CORRELATION_ID" \
    --arg owner "$OWNER" \
    '{
      schema_version: "1.0",
      generated_at: (now | todate),
      correlation_id: $cid,
      source: {
        workflow: "engine-\($engine)"
        job: $job
      },
      entity: {
        type: "organization",
        owner: $owner
      },
      event: {
        category: $engine,
        action: "success",
        reason: null
      },
      details: {
        summary_only: true,
        message: "Engine completed successfully"
      }
    }'
  )

else
  if [[ -z "$RESULT_FILE" ]]; then
    echo "::error::RESULT_FILE is required unless SUMMARY_ONLY=true"
    exit 1
  fi

  if [[ ! -f "$RESULT_FILE" ]]; then
    echo "::error::Result file not found: $RESULT_FILE"
    exit 1
  fi

  ACTION=$(jq -r '.ok | if . then "success" else "failed" end' "$RESULT_FILE")

  PAYLOAD=$(jq -c \
    --arg engine "$ENGINE_NAME" \
    --arg job "$ENGINE_JOB" \
    --arg cid "$CORRELATION_ID" \
    --arg action "$ACTION" \
    --arg owner "$OWNER" \
    --arg repo "$REPO" \
    '{
      schema_version: "1.0",
      generated_at: (now | todate),
      correlation_id: $cid,
      source: {
        workflow: "engine-\($engine)"
        job: $job
      },
      entity: {
        type: "repository",
        owner: $owner,
        repo: $repo
      },
      event: {
        category: $engine,
        action: $action,
        reason: null
      },
      details: input
    }' "$RESULT_FILE"
  )
fi

# ─────────────────────────────────────────────
# Emit
# ─────────────────────────────────────────────
echo "$PAYLOAD" | gh api \
  --method POST \
  "/repos/${TELEMETRY_REPO}/contents/telemetry/v1/events/$(date +%Y-%m-%d).jsonl" \
  --field message="telemetry: ${ENGINE_NAME}" \
  --field content="$(printf '%s\n' "$PAYLOAD" | base64 -w0)" \
  --field encoding="base64" \
  >/dev/null
