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

# NOTE:
# This script MUST NOT:
# - cd
# - git clone
# - assume repo checkout
# Telemetry is emitted ONLY via GitHub Contents API.

if pwd | grep -q telemetry; then
  echo "::error::Telemetry scripts must not run inside telemetry repo"
  exit 1
fi

if [[ ! -f "$RESULT_FILE" ]]; then
  echo "::error::Result file not found: $RESULT_FILE"
  exit 1
fi

# ─────────────────────────────────────────────
# Derive action from result
# ─────────────────────────────────────────────
ACTION=$(jq -r 'select(type=="object") | .ok | if . then "success" else "failed" end' "$RESULT_FILE")

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
  '
  select(type=="object")
  | {
      schema_version: "1.0",
      generated_at: (now | todate),
      correlation_id: $cid,
      source: {
        workflow: ("engine-" + $engine),
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
      details: .
    }
  ' "$RESULT_FILE"
)

# ─────────────────────────────────────────────
# Emit telemetry (SAFE JSONL append)
# ─────────────────────────────────────────────
EVENT_PATH="telemetry/v1/repos/${REPO}/$(date +%Y-%m-%d).jsonl"
API_PATH="/repos/${TELEMETRY_REPO}/contents/${EVENT_PATH}"

EXISTING=$(gh api "$API_PATH" --jq '{sha: .sha, content: .content}' 2>/dev/null || true)

if [[ -n "$EXISTING" ]]; then
  SHA=$(jq -r '.sha' <<<"$EXISTING")
  OLD_CONTENT=$(jq -r '.content' <<<"$EXISTING" | base64 --decode)
  NEW_CONTENT=$(printf "%s\n%s\n" "$OLD_CONTENT" "$PAYLOAD")
else
  SHA=""
  NEW_CONTENT=$(printf "%s\n" "$PAYLOAD")
fi

ENCODED=$(printf "%s" "$NEW_CONTENT" | base64 -w0)

ARGS=(
  --method PUT
  "$API_PATH"
  --field message="telemetry: ${ENGINE_NAME}"
  --field content="$ENCODED"
  --field encoding="base64"
)

if [[ -n "$SHA" ]]; then
  ARGS+=( --field sha="$SHA" )
fi

gh api "${ARGS[@]}" >/dev/null
