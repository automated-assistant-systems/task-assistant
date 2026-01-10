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
  echo "❌ TELEMETRY_REPO env var is required"
  exit 1
fi

for cmd in gh jq node; do
  command -v "$cmd" >/dev/null || { echo "❌ Missing dependency: $cmd"; exit 1; }
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKDIR="$(mktemp -d)"
TELE_DIR="$WORKDIR/telemetry"

trap 'rm -rf "$WORKDIR"' EXIT

REPO_NAME="$(basename "$REPO")"
TODAY_UTC="$(date -u +"%Y-%m-%d")"

echo "🔬 Phase 3.2 Validation"
echo "Sandbox repo: $REPO"
echo "Telemetry repo: $TELEMETRY_REPO"
echo "UTC date: $TODAY_UTC"
echo

# ------------------------------------------------------------
# 1) prepare-repo apply
# ------------------------------------------------------------
echo "→ Running prepare-repo (apply)..."
APPLY_JSON="$(node "$ROOT_DIR/scripts/prepare-repo.js" "$REPO" --json)"
echo "$APPLY_JSON" | jq . >/dev/null
[[ "$(echo "$APPLY_JSON" | jq -r '.ok')" == "true" ]] || {
  echo "❌ prepare-repo apply failed"; exit 1;
}
echo "✓ prepare-repo apply ok"

# ------------------------------------------------------------
# 2) prepare-repo dry-run (idempotency)
# ------------------------------------------------------------
echo
echo "→ Running prepare-repo (dry-run)..."
DRY_JSON="$(node "$ROOT_DIR/scripts/prepare-repo.js" "$REPO" --dry-run --json)"
echo "$DRY_JSON" | jq . >/dev/null
[[ "$(echo "$DRY_JSON" | jq -r '.ok')" == "true" ]] || {
  echo "❌ prepare-repo dry-run failed"; exit 1;
}
echo "✓ prepare-repo dry-run ok"

# ------------------------------------------------------------
# 3) Create issue and trigger INTENTIONAL violations
# ------------------------------------------------------------
echo
echo "→ Creating certification issue..."
ISSUE_URL="$(
  gh issue create \
    --repo "$REPO" \
    --title "Phase 3.2 Certification (auto)" \
    --body "Automated Phase 3.2 validation." \
    --label "phase-3.2" \
    --label "track/backlog"
)"
ISSUE_NUMBER="$(echo "$ISSUE_URL" | sed -n 's#.*/issues/\([0-9]\+\).*#\1#p')"
echo "✓ Created issue #$ISSUE_NUMBER"

echo
echo "→ Introducing enforcement violations..."
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label "phase-3.5" >/dev/null
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label "track/sprint" >/dev/null
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
  --milestone "Phase 3.1 – Telemetry Enhancements" >/dev/null || true
echo "✓ Violations introduced"

# ------------------------------------------------------------
# 4) Expect FIRST issue-events run to FAIL
# ------------------------------------------------------------
echo
echo "→ Waiting for failing issue-events run..."
FAIL_RUN_ID="$(gh run list \
  --repo "$REPO" \
  --workflow "task-assistant-issue-events.yml" \
  --limit 5 \
  --json databaseId,conclusion \
  | jq -r '.[] | select(.conclusion=="failure") | .databaseId' | head -n1)"

[[ -n "$FAIL_RUN_ID" ]] || {
  echo "❌ Expected failing issue-events run not found"
  exit 1
}

gh run watch --repo "$REPO" "$FAIL_RUN_ID" --exit-status || true
echo "✓ issue-events failed as expected (run $FAIL_RUN_ID)"

# ------------------------------------------------------------
# 5) Repair issue and re-trigger enforcement
# ------------------------------------------------------------
echo
echo "→ Repairing issue state..."
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
  --remove-label "track/backlog" >/dev/null
echo "✓ Issue repaired"

# Touch issue to retrigger
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label "telemetry" >/dev/null
sleep 2
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --remove-label "telemetry" >/dev/null

# ------------------------------------------------------------
# 6) Expect SUCCESS issue-events run
# ------------------------------------------------------------
echo
echo "→ Waiting for successful issue-events run..."
OK_RUN_ID="$(gh run list \
  --repo "$REPO" \
  --workflow "task-assistant-issue-events.yml" \
  --limit 5 \
  --json databaseId,conclusion \
  | jq -r '.[] | select(.conclusion=="success") | .databaseId' | head -n1)"

[[ -n "$OK_RUN_ID" ]] || {
  echo "❌ Expected successful issue-events run not found"
  exit 1
}

gh run watch --repo "$REPO" "$OK_RUN_ID" --exit-status
echo "✓ issue-events recovered successfully (run $OK_RUN_ID)"

# ------------------------------------------------------------
# 7) Run self-test and nightly sweep
# ------------------------------------------------------------
echo
echo "→ Running self-test..."
gh workflow run "task-assistant-self-test.yml" --repo "$REPO" >/dev/null
sleep 2
SELF_ID="$(gh run list --repo "$REPO" --workflow task-assistant-self-test.yml --limit 1 --json databaseId | jq -r '.[0].databaseId')"
gh run watch --repo "$REPO" "$SELF_ID" --exit-status
echo "✓ Self-test passed"

echo
echo "→ Running nightly sweep..."
gh workflow run "task-assistant-nightly-sweep.yml" --repo "$REPO" >/dev/null
sleep 2
SWEEP_ID="$(gh run list --repo "$REPO" --workflow task-assistant-nightly-sweep.yml --limit 1 --json databaseId | jq -r '.[0].databaseId')"
gh run watch --repo "$REPO" "$SWEEP_ID" --exit-status
echo "✓ Nightly sweep passed"

# ------------------------------------------------------------
# 8) Validate telemetry placement
# ------------------------------------------------------------
echo
echo "📡 Validating telemetry..."
gh repo clone "$TELEMETRY_REPO" "$TELE_DIR" -- --quiet

REPO_FILE="$TELE_DIR/telemetry/v1/repos/$REPO_NAME/$TODAY_UTC.jsonl"
META_FILE="$TELE_DIR/telemetry/v1/meta/$TODAY_UTC.jsonl"

[[ -f "$REPO_FILE" ]] || {
  echo "❌ Missing repo telemetry file"; exit 1;
}

for cat in issue-events self-test nightly-sweep; do
  grep -q "\"category\":\"$cat\"" "$REPO_FILE" || {
    echo "❌ Missing telemetry category: $cat"; exit 1;
  }
done

if [[ -f "$META_FILE" ]] && grep -q "\"repo\":\"$REPO_NAME\"" "$META_FILE"; then
  echo "❌ Repo telemetry leaked into meta"
  exit 1
fi

echo
echo "🏁 Phase 3.2 VALIDATION: PASSED"
echo "Telemetry proof: $REPO_FILE"
