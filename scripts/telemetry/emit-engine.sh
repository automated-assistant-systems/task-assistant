#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Required env (strict)
# ─────────────────────────────────────────────
: "${ENGINE_NAME:?Missing ENGINE_NAME (e.g. preflight, self-test, validate, dashboard)}"
: "${ENGINE_JOB:?Missing ENGINE_JOB}"
: "${CORRELATION_ID:?Missing CORRELATION_ID}"

: "${OWNER:?Missing OWNER}"
: "${REPO:?Missing REPO}"
: "${TELEMETRY_REPO:?Missing TELEMETRY_REPO}"

: "${GH_TOKEN:?telemetry: GH_TOKEN is not set}"
: "${RESULT_FILE:?RESULT_FILE is required}"

# ─────────────────────────────────────────────
# Safety checks
# ─────────────────────────────────────────────
if pwd | grep -q telemetry; then
  echo "::error::Telemetry emit must not run inside telemetry repo"
  exit 1
fi

if [[ ! -f "$RESULT_FILE" ]]; then
  echo "::error::Result file not found: $RESULT_FILE"
  exit 1
fi

# Payload must not redefine repo identity
if jq -e '.. | objects | has("owner") and has("repo")' "$RESULT_FILE" >/dev/null; then
  echo "::error::Result payload must not redefine owner/repo"
  exit 1
fi

# ─────────────────────────────────────────────
# Derive action
# ─────────────────────────────────────────────
OK="$(jq -r '.ok // false' "$RESULT_FILE")"
ACTION="failed"
[[ "$OK" == "true" ]] && ACTION="success"

# ─────────────────────────────────────────────
# Build telemetry payload
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
# Paths (IMMUTABLE)
# ─────────────────────────────────────────────
DATE="$(date +%Y-%m-%d)"

BASE_DIR="telemetry/v1/repos/${REPO}/${DATE}/${CORRELATION_ID}"
EVENT_FILE="${ENGINE_NAME}.json"
EVENT_PATH="${BASE_DIR}/${EVENT_FILE}"
API_BASE="repos/${TELEMETRY_REPO}/contents"

# ─────────────────────────────────────────────
# Ensure directory exists (idempotent)
# ─────────────────────────────────────────────
gh api \
  --method PUT \
  "${API_BASE}/${BASE_DIR}/.keep" \
  --field message="chore(telemetry): ensure run directory exists" \
  --field content="$(printf '' | base64)" \
  >/dev/null 2>&1 || true

# ─────────────────────────────────────────────
# Write immutable engine record
# ─────────────────────────────────────────────
ENCODED="$(printf '%s' "$PAYLOAD" | base64 -w0)"

gh api \
  --method PUT \
  "${API_BASE}/${EVENT_PATH}" \
  --field message="telemetry: ${ENGINE_NAME} (${CORRELATION_ID})" \
  --field content="$ENCODED" \
  --field encoding="base64" \
  >/dev/null

echo "✓ Telemetry emitted: ${EVENT_PATH}"
