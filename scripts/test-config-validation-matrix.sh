#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------
REPO="automated-assistant-systems/task-assistant-sandbox"
GOOD_CONFIG=".github/task-assistant.yml"
BACKUP="/tmp/task-assistant.yml.bak"
TODAY=$(date -u +%Y-%m-%d)

TEST_RUN_ID="cfg-matrix-$(date -u +%Y%m%dT%H%M%SZ)-$$"

echo "🔬 Phase 3.3 — Config Validation Matrix Test"
echo "Repo: $REPO"
echo "🧪 Test Run ID: $TEST_RUN_ID"
echo

WORKDIR=""

cleanup() {
  [[ -n "$WORKDIR" && -d "$WORKDIR" ]] && rm -rf "$WORKDIR"
}

trap 'echo "⚠️ Test aborted — restoring sandbox"; scripts/recover-sandbox-config.sh; cleanup' ERR INT

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
fail() {
  echo "❌ $1"
  exit 1
}

wait_for_failure() {
  local workflow="$1"
  echo "→ Waiting for $workflow to fail..."
  gh run list --repo "$REPO" --workflow "$workflow" --limit 1 \
    --json conclusion --jq '.[0].conclusion' | grep -q "failure" \
    || fail "$workflow did not fail as expected"
}

assert_no_enforcement_telemetry() {
  local file="telemetry/v1/repos/task-assistant-sandbox/$TODAY.jsonl"
  grep -q '"category":"issue-events".*"ok":false' "$file" && \
    fail "Enforcement telemetry should not exist on config validation failure"
}

# ------------------------------------------------------------
# Backup valid config
# ------------------------------------------------------------
echo "→ Backing up valid config"
WORKDIR=$(mktemp -d /tmp/ta-test.XXXXXX)
gh repo clone "$REPO" "$WORKDIR" >/dev/null
cp "$WORKDIR/$GOOD_CONFIG" "$BACKUP"

# ------------------------------------------------------------
# Error Fixtures
# ------------------------------------------------------------
declare -A FIXTURES

FIXTURES[E1]="tracks: []"
FIXTURES[E2]="tracks: wrong"
FIXTURES[E3]="
tracks: []
labels: []
milestones: []
enforcement:
  exclusivity:
    phase:
      mode: invalid
"
FIXTURES[E4]="
tracks: []
labels: []
milestones: []
enforcement: true
"
FIXTURES[E5]="
tracks: []
labels: []
milestones: []
enforcment:
  enabled: true
"

# ------------------------------------------------------------
# Execute Matrix
# ------------------------------------------------------------
for ID in "${!FIXTURES[@]}"; do
  echo
  echo "🧪 Testing error case $ID"
  echo "🧪 Test Run: $TEST_RUN_ID | Case: $ID"

  echo "${FIXTURES[$ID]}" > "$WORKDIR/$GOOD_CONFIG"

  (
    cd "$WORKDIR"

    git add "$GOOD_CONFIG"

    if git diff --cached --quiet; then
      echo "⚠️ No config change detected for $ID — forcing commit"
      git commit --allow-empty -m "test invalid config $ID [$TEST_RUN_ID]" >/dev/null
    else
      git commit -m "test invalid config $ID [$TEST_RUN_ID]" >/dev/null
    fi

    git push >/dev/null
  )

  echo "→ Triggering issue-events"

  ISSUE_URL=$(gh issue create \
    --repo "$REPO" \
    --title "[test:$TEST_RUN_ID][$ID] config validation failure" \
    --body "Config validation matrix test

TestRun: $TEST_RUN_ID
Case: $ID
Expected: early validation failure, no enforcement
"
  )

  ISSUE=$(echo "$ISSUE_URL" | grep -Eo '[0-9]+$')

  if [[ -z "$ISSUE" ]]; then
    fail "Unable to extract issue number"
  fi

  gh issue edit "$ISSUE" --repo "$REPO" --add-label "track/sprint" >/dev/null

  wait_for_failure "task-assistant-issue-events.yml"

  echo "→ Triggering self-test"
  gh workflow run task-assistant-self-test.yml --repo "$REPO"
  wait_for_failure "task-assistant-self-test.yml"

  echo "→ Triggering nightly sweep"
  gh workflow run task-assistant-nightly-sweep.yml --repo "$REPO"
  wait_for_failure "task-assistant-nightly-sweep.yml"

  echo "→ Verifying no enforcement telemetry"
  assert_no_enforcement_telemetry

  echo "✓ Error case $ID behaved correctly"

  scripts/recover-sandbox-config.sh
done

cleanup

echo
echo "🏁 Phase 3.3 Config Validation Matrix: PASSED"
echo "🧪 Test Run ID: $TEST_RUN_ID"
