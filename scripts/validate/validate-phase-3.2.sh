#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-}"
TELEMETRY_REPO="${TELEMETRY_REPO:-}"

if [[ -z "$REPO" ]]; then
  echo "Usage: scripts/validate/validate-phase-3.2.sh <owner/repo>"
  echo "Env required: TELEMETRY_REPO=org/telemetry-repo"
  exit 1
fi

if [[ -z "$TELEMETRY_REPO" ]]; then
  echo "❌ TELEMETRY_REPO env var is required (e.g. automated-assistant-systems/task-assistant-telemetry)"
  exit 1
fi

command -v gh >/dev/null || { echo "Missing dependency: gh"; exit 1; }
command -v jq >/dev/null || { echo "Missing dependency: jq"; exit 1; }
command -v node >/dev/null || { echo "Missing dependency: node"; exit 1; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKDIR="$(mktemp -d)"
TELE_DIR="$WORKDIR/telemetry"

cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

REPO_NAME="$(basename "$REPO")"
TODAY_UTC="$(date -u +"%Y-%m-%d")"

echo "🔬 Phase 3.2 Validation"
echo "Sandbox repo: $REPO"
echo "Telemetry repo: $TELEMETRY_REPO"
echo "UTC date: $TODAY_UTC"
echo

gh auth status >/dev/null 2>&1 || {
  echo "❌ gh is not authenticated. Run: gh auth login"
  exit 1
}

# ------------------------------------------------------------
# 1) prepare-repo apply: must create missing phase + track labels + milestones
# ------------------------------------------------------------
echo "→ Running prepare-repo (apply)..."
APPLY_JSON="$(node "$ROOT_DIR/scripts/prepare-repo.js" "$REPO" --json)"
echo "$APPLY_JSON" | jq . >/dev/null

OK_APPLY="$(echo "$APPLY_JSON" | jq -r '.ok')"
if [[ "$OK_APPLY" != "true" ]]; then
  echo "❌ prepare-repo apply reported ok=false"
  echo "$APPLY_JSON" | jq .
  exit 1
fi
echo "✓ prepare-repo apply ok"

# ------------------------------------------------------------
# 2) prepare-repo dry-run idempotency: must be compliant
# ------------------------------------------------------------
echo
echo "→ Running prepare-repo (dry-run idempotency)..."
DRY_JSON="$(node "$ROOT_DIR/scripts/prepare-repo.js" "$REPO" --dry-run --json)"
echo "$DRY_JSON" | jq . >/dev/null

OK_DRY="$(echo "$DRY_JSON" | jq -r '.ok')"
SUMMARY_DRY="$(echo "$DRY_JSON" | jq -r '.summary')"
if [[ "$OK_DRY" != "true" ]]; then
  echo "❌ prepare-repo dry-run reported ok=false"
  echo "$DRY_JSON" | jq .
  exit 1
fi
echo "✓ prepare-repo dry-run ok: $SUMMARY_DRY"

# ------------------------------------------------------------
# 3) Create a certification issue and exercise enforcement paths
#    - multiple phase labels
#    - multiple track labels
#    - wrong milestone
# ------------------------------------------------------------
echo
echo "→ Creating certification issue..."
CREATE_OUT="$(
  gh issue create \
    --repo "$REPO" \
    --title "Phase 3.2 Certification (auto)" \
    --body "Created by validate-phase-3.2.sh to exercise issue-events enforcement." \
    --label "phase-3.2" \
    --label "track/backlog"
)"

ISSUE_URL="$(echo "$CREATE_OUT" | tail -n 1)"
ISSUE_NUMBER="$(echo "$ISSUE_URL" | sed -n 's#.*/issues/\([0-9]\+\).*#\1#p')"

if [[ -z "$ISSUE_NUMBER" ]]; then
  echo "❌ Could not parse issue number from: $CREATE_OUT"
  exit 1
fi

echo "✓ Created issue #$ISSUE_NUMBER ($ISSUE_URL)"

echo
echo "→ Exercising enforcement rules..."

# Add a conflicting phase label (should resolve to single allowed phase label)
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label "phase-3.5" >/dev/null

# Add conflicting track label (should resolve to one track only)
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label "track/sprint" >/dev/null

# Force wrong milestone to see correction
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --milestone "Phase 3.1 – Telemetry Enhancements" >/dev/null || true

echo "✓ Issue updated to trigger issue-events enforcement"

# ------------------------------------------------------------
# 4) Wait for Issue Events workflow to complete successfully
# ------------------------------------------------------------
echo
echo "→ Waiting for Issue Events workflow run..."
# Find newest run for the workflow
RUN_ID="$(gh run list --repo "$REPO" --workflow "task-assistant-issue-events.yml" --limit 10 --json databaseId,createdAt,status,conclusion \
  | jq -r '.[0].databaseId // empty')"

if [[ -z "$RUN_ID" ]]; then
  echo "❌ Could not find a run for task-assistant-issue-events.yml"
  echo "Tip: ensure workflows were installed to sandbox and issue-events is enabled."
  exit 1
fi

gh run watch --repo "$REPO" "$RUN_ID" --exit-status
echo "✓ Issue Events workflow succeeded (run $RUN_ID)"

# ------------------------------------------------------------
# 5) Dispatch self-test + nightly-sweep and wait for success
# ------------------------------------------------------------
echo
echo "→ Dispatching Self-Test workflow..."
gh workflow run "task-assistant-self-test.yml" --repo "$REPO" >/dev/null
sleep 2
SELF_RUN_ID="$(gh run list --repo "$REPO" --workflow "task-assistant-self-test.yml" --limit 5 --json databaseId,status,conclusion \
  | jq -r '.[0].databaseId // empty')"
[[ -n "$SELF_RUN_ID" ]] || { echo "❌ Could not find self-test run"; exit 1; }
gh run watch --repo "$REPO" "$SELF_RUN_ID" --exit-status
echo "✓ Self-Test succeeded (run $SELF_RUN_ID)"

echo
echo "→ Dispatching Nightly Sweep workflow..."
gh workflow run "task-assistant-nightly-sweep.yml" --repo "$REPO" >/dev/null
sleep 2
SWEEP_RUN_ID="$(gh run list --repo "$REPO" --workflow "task-assistant-nightly-sweep.yml" --limit 5 --json databaseId,status,conclusion \
  | jq -r '.[0].databaseId // empty')"
[[ -n "$SWEEP_RUN_ID" ]] || { echo "❌ Could not find nightly-sweep run"; exit 1; }
gh run watch --repo "$REPO" "$SWEEP_RUN_ID" --exit-status
echo "✓ Nightly Sweep succeeded (run $SWEEP_RUN_ID)"

# ------------------------------------------------------------
# 6) Validate telemetry proof (repo-scoped file exists, contains expected categories)
#    and ensure meta does NOT contain this repo’s events
# ------------------------------------------------------------
echo
echo "📡 Validating telemetry output..."

echo "→ Cloning telemetry repo..."
gh repo clone "$TELEMETRY_REPO" "$TELE_DIR" -- --quiet

REPO_FILE="$TELE_DIR/telemetry/v1/repos/$REPO_NAME/$TODAY_UTC.jsonl"
META_FILE="$TELE_DIR/telemetry/v1/meta/$TODAY_UTC.jsonl"

if [[ ! -f "$REPO_FILE" ]]; then
  echo "❌ Missing repo telemetry file: $REPO_FILE"
  echo "Likely causes:"
  echo "- emit.js not writing repo-scoped path"
  echo "- workflows not using emit.js"
  echo "- TELEMETRY_REPO token/permissions issue"
  exit 1
fi

echo "✓ Found repo telemetry file: $REPO_FILE"

# Must contain at least one event for each category:
# - self-test
# - nightly-sweep
# - issue-events
for cat in "self-test" "nightly-sweep" "issue-events"; do
  if ! grep -q "\"category\":\"$cat\"" "$REPO_FILE"; then
    echo "❌ Repo telemetry missing category: $cat"
    exit 1
  fi
  echo "✓ Repo telemetry contains category: $cat"
done

# Ensure issue-events appears in repo file
if ! grep -q "\"category\":\"issue-events\"" "$REPO_FILE"; then
  echo "❌ Repo telemetry missing issue-events entries"
  exit 1
fi

# Ensure meta file does not contain this repo’s records
if [[ -f "$META_FILE" ]]; then
  if grep -q "\"repo\":\"$REPO_NAME\"" "$META_FILE"; then
    echo "❌ Telemetry violation: records for repo=$REPO_NAME found in meta file: $META_FILE"
    exit 1
  fi
  echo "✓ Meta file exists but contains no records for repo=$REPO_NAME"
else
  echo "✓ No meta file for today (ok)"
fi

echo
echo "🏁 Phase 3.2 VALIDATION: PASSED"
echo "Repo telemetry proof: $REPO_FILE"
