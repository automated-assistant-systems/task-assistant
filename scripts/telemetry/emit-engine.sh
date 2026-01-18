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
EVENT_FILE="telemetry/v1/repos/${REPO}/$(date +%Y-%m-%d).jsonl"

cd telemetry-repo   # already checked out with GH_TOKEN

mkdir -p "$(dirname "$EVENT_FILE")"

# Append payload EXACTLY as a line
printf '%s\n' "$PAYLOAD" >> "$EVENT_FILE"

git add "$EVENT_FILE"

# Commit only if file changed
if ! git diff --cached --quiet; then
  git commit -m "telemetry: ${ENGINE_NAME} (${REPO})"
  git push
fi
