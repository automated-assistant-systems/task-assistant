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

# Telemetry scripts must never run inside telemetry repo
if pwd | grep -q telemetry; then
  echo "::error::Telemetry scripts must not run inside telemetry repo"
  exit 1
fi

if [[ ! -f "$RESULT_FILE" ]]; then
  echo "::error::Result file not found: $RESULT_FILE"
  exit 1
fi

# ─────────────────────────────────────────────
# Derive action (explicit + safe)
# ─────────────────────────────────────────────
OK="$(jq -r '.ok // false' "$RESULT_FILE")"
if [[ "$OK" == "true" ]]; then
  ACTION="success"
else
  ACTION="failed"
fi

# ─────────────────────────────────────────────
# Build telemetry payload (repo-scoped)
# ─────────────────────────────────────────────
PAYLOAD="$(
  jq -c \
    --arg engine "$ENGINE_NAME" \
    --arg job "$ENGINE_JOB" \
    --arg cid "$CORRELATION_ID" \
    --arg action "$ACTION" \
    --arg owner "$OWNER" \
    --arg repo "$REPO" \
    '
    {
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
)"

# ─────────────────────────────────────────────
# Emit (append JSONL safely)
# ─────────────────────────────────────────────
EVENT_PATH="telemetry/v1/repos/${REPO}/$(date +%Y-%m-%d).jsonl"
API_PATH="/repos/${TELEMETRY_REPO}/contents/${EVENT_PATH}"

TMP="$(mktemp)"
SHA=""

# Fetch existing file if present
if EXISTING="$(gh api "$API_PATH" 2>/dev/null)"; then
  SHA="$(jq -r '.sha' <<<"$EXISTING")"
  jq -r '.content' <<<"$EXISTING" | base64 --decode >"$TMP"
else
  : >"$TMP"
fi

# Append event
printf '%s\n' "$PAYLOAD" >>"$TMP"

ENCODED="$(base64 -w0 "$TMP")"

ARGS=(
  --method PUT
  "$API_PATH"
  --field message="telemetry: ${ENGINE_NAME}"
  --field content="$ENCODED"
  --field encoding="base64"
)

if [[ -n "$SHA" && "$SHA" != "null" ]]; then
  ARGS+=( --field sha="$SHA" )
fi

gh api "${ARGS[@]}" >/dev/null

rm -f "$TMP"
