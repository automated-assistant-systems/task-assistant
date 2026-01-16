#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Task Assistant — Engine Telemetry Emitter
#
# Inputs (env):
#   ENGINE_NAME        self-test | validate | enforce | sweep
#   ENGINE_JOB         workflow job name
#   RESULT_FILE        path to engine result JSON
#   CORRELATION_ID
#   OWNER
#   REPO
#   GH_TOKEN
#   TELEMETRY_REPO
# ─────────────────────────────────────────────

required=(
  ENGINE_NAME
  ENGINE_JOB
  RESULT_FILE
  CORRELATION_ID
  OWNER
  REPO
)

for var in "${required[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "::error::Missing required env var: $var"
    exit 1
  fi
done

if [[ ! -f "$RESULT_FILE" ]]; then
  echo "::error::Result file not found: $RESULT_FILE"
  exit 1
fi

ACTION=$(jq -r '.ok | if . then "success" else "failed" end' "$RESULT_FILE")

PAYLOAD=$(jq -n -c \
  --arg engine "$ENGINE_NAME" \
  --arg job "$ENGINE_JOB" \
  --arg action "$ACTION" \
  --arg cid "$CORRELATION_ID" \
  --arg owner "$OWNER" \
  --arg repo "$REPO" \
  --slurpfile details "$RESULT_FILE" \
  '{
    schema_version: "1.0",
    generated_at: (now | todate),
    correlation_id: $cid,
    source: {
      workflow: "task-assistant-dispatch.yml",
      job: $job,
      run_id: env.GITHUB_RUN_ID
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
    details: $details[0]
  }'
)

echo "$PAYLOAD" | jq . >/dev/null
echo "$PAYLOAD" | node scripts/telemetry/emit.js
