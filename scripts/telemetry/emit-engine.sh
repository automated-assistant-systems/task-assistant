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

TMP="$(mktemp)"

# Fetch existing file if it exists
if gh api "$API_PATH" --silent > /dev/null 2>&1; then
  gh api "$API_PATH" --jq '.content' | base64 --decode > "$TMP"
fi

# Append new event (always newline-safe)
printf '%s\n' "$PAYLOAD" >> "$TMP"

# Upload
gh api \
  --method PUT \
  "$API_PATH" \
  --field message="telemetry: ${ENGINE_NAME}" \
  --field content="$(base64 -w0 "$TMP")" \
  --field encoding="base64" \
  ${SHA:+--field sha="$SHA"} \
  >/dev/null

rm -f "$TMP"

