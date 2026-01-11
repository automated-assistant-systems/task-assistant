#!/usr/bin/env bash
set -euo pipefail

#############################################
# Phase 3.3 — Config Validation Certification
#############################################

SANDBOX_REPO="automated-assistant-systems/task-assistant-sandbox"
WORKDIR="$(mktemp -d)"
RUN_ID="cfg-cert-$(date -u +%Y%m%dT%H%M%SZ)-$RANDOM"

echo "🔬 Phase 3.3 — Config Validation Certification"
echo "Repo: $SANDBOX_REPO"
echo "🧪 Run ID: $RUN_ID"
echo

#############################################
# Cleanup
#############################################

cleanup() {
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

#############################################
# Reset sandbox
#############################################

echo "→ Resetting sandbox to canonical state"
gh repo clone "$SANDBOX_REPO" "$WORKDIR/repo" -- --quiet
cd "$WORKDIR/repo"

GOOD_COMMIT=$(git log --grep="install task assistant" --format="%H" -n 1)
if [[ -z "$GOOD_COMMIT" ]]; then
  echo "❌ Could not locate canonical install commit"
  exit 1
fi

git reset --hard "$GOOD_COMMIT"
git push --force origin main --quiet
echo "✓ Sandbox reset to $GOOD_COMMIT"
echo

#############################################
# Expectations
#############################################

expect_self_test() {
  case "$1" in
    E4) echo "PASS" ;;
    *)  echo "FAIL" ;;
  esac
}

expect_nightly() {
  case "$1" in
    E4) echo "PASS" ;;
    *)  echo "FAIL" ;;
  esac
}

#############################################
# Apply config mutation
#############################################

apply_mutation() {
  local CASE="$1"
  local CFG=".github/task-assistant.yml"

  git checkout -- "$CFG"

  case "$CASE" in
    E1)
      sed -i '/^tracks:/,/^[^ ]/d' "$CFG"
      ;;
    E2)
      printf "::::invalid_yaml\n" > "$CFG"
      ;;
    E3)
      printf "\nunknownKey: true\n" >> "$CFG"
      ;;
    E4)
      # Force invalid enforcement schema (scalar instead of object)
      sed -i '/^enforcement:/,/^[^ ]/d' "$CFG"
      printf "\nenforcement: true\n" >> "$CFG"
      ;;
    *)
      echo "❌ Unknown case $CASE"
      exit 1
      ;;
  esac

  if git diff --quiet; then
    echo "❌ $CASE did not modify config"
    exit 1
  fi

  git commit -am "test(cfg): $CASE — config validation"
  git push origin main --quiet
}

#############################################
# Trigger issue-events (REAL trigger)
#############################################

trigger_issue_events_and_expect_fail() {
  echo "→ Triggering issue-events via issue creation"

  gh issue create \
    --repo "$SANDBOX_REPO" \
    --title "cfg-cert $RUN_ID" \
    --body "Phase 3.3 config validation test" \
    --label "codex:execute" \
    >/dev/null

  sleep 15

  ISSUE_NUMBER=$(gh issue list \
    --repo "$SANDBOX_REPO" \
    --limit 1 \
    --json number \
    -q '.[0].number')

  echo "✓ Issue #$ISSUE_NUMBER created"

  RESULT=$(gh run list \
    --repo "$SANDBOX_REPO" \
    --workflow "task-assistant-issue-events.yml" \
    --limit 1 \
    --json conclusion \
    -q '.[0].conclusion')

  if [[ "$RESULT" == "success" ]]; then
    echo "❌ issue-events passed (expected FAIL)"
    exit 1
  fi

  echo "✓ issue-events failed as expected"
}

#############################################
# Trigger workflow and assert
#############################################

trigger_and_expect() {
  local WF="$1"
  local EXPECT="$2"

  echo "→ Triggering $WF (expect $EXPECT)"
  gh workflow run "$WF" --repo "$SANDBOX_REPO" >/dev/null

  sleep 12

  RESULT=$(gh run list \
    --repo "$SANDBOX_REPO" \
    --workflow "$WF" \
    --limit 1 \
    --json conclusion \
    -q '.[0].conclusion')

  if [[ "$EXPECT" == "PASS" && "$RESULT" != "success" ]]; then
    echo "❌ $WF failed (expected PASS)"
    exit 1
  fi

  if [[ "$EXPECT" == "FAIL" && "$RESULT" == "success" ]]; then
    echo "❌ $WF passed (expected FAIL)"
    exit 1
  fi

  echo "✓ $WF behaved as expected"
}

#############################################
# Execute certification
#############################################

ERROR_CASES=(E1 E2 E3 E4)

for CASE in "${ERROR_CASES[@]}"; do
  echo
  echo "🧪 Case $CASE"
  apply_mutation "$CASE"

  trigger_issue_events_and_expect_fail
  trigger_and_expect "task-assistant-self-test.yml" "$(expect_self_test "$CASE")"
  trigger_and_expect "task-assistant-nightly-sweep.yml" "$(expect_nightly "$CASE")"

  echo "✓ Case $CASE certified"
done

echo
echo "✅ Phase 3.3 Config Validation Certification PASSED"
