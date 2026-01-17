#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Required env (strict)
# ─────────────────────────────────────────────
: "${ENGINE_NAME:?Missing ENGINE_NAME}"
: "${ENGINE_JOB:?Missing ENGINE_JOB}"
: "${CORRELATION_ID:?Missing CORRELATION_ID}"

: "${OWNER:?Missing OWNER}"
: "${REPO:?Missing REPO}"
: "${TELEMETRY_REPO:?Missing TELEMETRY_REPO}"

: "${GH_TOKEN:?telemetry: GH_TOKEN is not set}"
: "${RESULT_FILE:?RESULT_FILE is required}"

if [[ ! -f "$RESULT_FILE" ]]; then
  echo "::error::Result file not found: $RESULT_FILE"
  exit 1
fi

# ─────────────────────────────────────────────
# Derive action from result
# ─────────────────────────────────────────────
ACTION=$(jq -r '.ok | if . then "success" else "failed" end' "$RESULT_FILE")

# ─────────────────────────────────────────────
# Build telemetry payload (repo-scoped ONLY)
# ─────────────────────────────────────────────
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
      workflow: "engine-\($engine)",
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

# ─────────────────────────────────────────────
# Emit (append JSONL)
# ─────────────────────────────────────────────
gh api \
  --method POST \
  "/repos/${TELEMETRY_REPO}/contents/telemetry/v1/events/$(date +%Y-%m-%d).jsonl" \
  --field message="telemetry: ${ENGINE_NAME}" \
  --field content="$(printf '%s\n' "$PAYLOAD" | base64 -w0)" \
  --field encoding="base64" \
  >/dev/null
