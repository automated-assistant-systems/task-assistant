#!/usr/bin/env bash
# Phase 3.4a — Workflow validation using lib/infra (read-only)

set -euo pipefail

# ─────────────────────────────────────────────
# Inputs (explicit; no hidden globals)
# ─────────────────────────────────────────────
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required (owner/repo)}"
: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"

TARGET_REPO="$GITHUB_REPOSITORY"
CORRELATION_ID="${CORRELATION_ID:-manual-validate}"

# Optional tuning
ALLOW_V1_FALLBACK="${ALLOW_V1_FALLBACK:-true}"
REQUIRE_REPO_ENABLED="${REQUIRE_REPO_ENABLED:-true}"

# Paths
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INFRA_JSON="$ROOT_DIR/infra-resolution.json"

echo "🔎 Task Assistant • Validate Workflows"
echo "→ Target repo: $TARGET_REPO"
echo "→ Correlation ID: $CORRELATION_ID"

for cmd in gh jq yq; do
  command -v "$cmd" >/dev/null || {
    echo "::error::Missing dependency: $cmd"
    exit 1
  }
done

# ─────────────────────────────────────────────
# Resolve infra via lib/infra (authoritative)
# ─────────────────────────────────────────────
echo "→ Resolving infra registry (v2-first)…"

pushd "$ROOT_DIR" >/dev/null

node <<'EOF'
import { resolveInfraForRepo } from "./lib/infra.js";
import fs from "fs";

const result = await resolveInfraForRepo({
  targetRepo: process.env.GITHUB_REPOSITORY,
  githubToken: process.env.GITHUB_TOKEN,
  allowV1Fallback: process.env.ALLOW_V1_FALLBACK === "true",
  requireRepoEnabled: process.env.REQUIRE_REPO_ENABLED === "true",
});

console.log("Infra resolution:");
console.log(JSON.stringify(result, null, 2));

fs.writeFileSync("infra-resolution.json", JSON.stringify(result, null, 2));

if (!["INFRA_OK_V2", "INFRA_OK_V1_FALLBACK"].includes(result.outcomeCode)) {
  console.error(`::error::Workflow validation failed: ${result.outcomeCode}`);
  process.exit(1);
}
EOF

popd >/dev/null

TELEMETRY_REPO="$(jq -r '.telemetryRepo' "$INFRA_JSON")"
INFRA_OUTCOME="$(jq -r '.outcomeCode' "$INFRA_JSON")"
INFRA_VERSION="$(jq -r '.versionUsed' "$INFRA_JSON")"

if [[ -z "$TELEMETRY_REPO" || "$TELEMETRY_REPO" == "null" ]]; then
  echo "::error::Infra resolved without telemetry repo"
  exit 1
fi

echo "✓ Infra resolved ($INFRA_VERSION): $TELEMETRY_REPO"

# ─────────────────────────────────────────────
# Validate repo hygiene (prepare-repo applied)
# ─────────────────────────────────────────────
echo "→ Validating labels and milestones…"

CONFIG="$ROOT_DIR/.github/task-assistant.yml"

EXPECTED_LABELS="$(yq -r '.labels[].name' "$CONFIG")"
EXPECTED_MILESTONES="$(yq -r '.milestones[].title' "$CONFIG")"

missing=false

for lbl in $EXPECTED_LABELS; do
  if ! gh label list --repo "$TARGET_REPO" --json name \
       | jq -r '.[].name' | grep -qx "$lbl"; then
    echo "::error::Missing label: $lbl"
    missing=true
  fi
done

for ms in $EXPECTED_MILESTONES; do
  if ! gh api "repos/$TARGET_REPO/milestones" --paginate \
       | jq -r '.[].title' | grep -qx "$ms"; then
    echo "::error::Missing milestone: $ms"
    missing=true
  fi
done

if [[ "$missing" == "true" ]]; then
  echo "::error::Repository not prepared — run prepare-repo first"
  exit 1
fi

echo "✓ Labels and milestones verified"
echo "ℹ️ Repository hygiene verified (prepare-repo already applied)"

# ─────────────────────────────────────────────
# Validate required workflows exist
# ─────────────────────────────────────────────
echo "→ Validating required workflows…"

REQUIRED_WORKFLOWS=(
  ".github/workflows/task-assistant-dispatch.yml"
)

for wf in "${REQUIRED_WORKFLOWS[@]}"; do
  if [[ ! -f "$wf" ]]; then
    echo "::error::Missing required workflow: $wf"
    exit 1
  fi
done

echo "✓ Required workflows present"

# ─────────────────────────────────────────────
# Validate workflow_call compatibility
# ─────────────────────────────────────────────
echo "→ Validating workflow_call inputs…"

yq -e '.on.workflow_call.inputs.target_repo' \
  .github/workflows/task-assistant-dispatch.yml >/dev/null

yq -e '.on.workflow_call.inputs.correlation_id' \
  .github/workflows/task-assistant-dispatch.yml >/dev/null

echo "✓ workflow_call inputs valid"

# ─────────────────────────────────────────────
# Validate app installation on telemetry repo
# ─────────────────────────────────────────────
echo "→ Verifying app access to telemetry repo…"

if gh api "repos/$TELEMETRY_REPO/contents/" >/dev/null 2>&1; then
  echo "✓ App access confirmed on $TELEMETRY_REPO"
else
  echo "::error::Task Assistant App is not installed on telemetry repo"
  echo "::error::Install the app on $TELEMETRY_REPO and re-run validation"
  exit 1
fi

# ─────────────────────────────────────────────
# Emit validation telemetry (non-mutating)
# ─────────────────────────────────────────────
echo "→ Emitting validation telemetry…"

jq -n \
  --slurpfile infra "$INFRA_JSON" \
  --arg repo "$TARGET_REPO" \
  --arg outcome "$INFRA_OUTCOME" \
  '{
    ok: true,
    engine: "validate",
    summary: "Workflow validation passed",
    target_repo: $repo,
    infra: $infra[0],
    checks: {
      workflows_present: "ok",
      workflow_call_inputs: "ok",
      telemetry_repo_access: "ok"
    }
  }' > "$ROOT_DIR/result.json"

ENGINE_NAME="validate" \
ENGINE_JOB="validate" \
TELEMETRY_REPO="$TELEMETRY_REPO" \
RESULT_FILE="$ROOT_DIR/result.json" \
"$ROOT_DIR/scripts/telemetry/emit-engine.sh"

echo "✓ Validation complete"
