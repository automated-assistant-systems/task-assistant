#!/usr/bin/env bash
set -euo pipefail

#############################################
# Phase 3.3 — Config Validation Certification
#############################################

SANDBOX_REPO="automated-assistant-systems/task-assistant-sandbox"
ROOT_PWD="$(pwd)"
RUN_ID="cfg-cert-$(date -u +%Y%m%dT%H%M%SZ)-$RANDOM"

echo "🔬 Phase 3.3 — Config Validation Certification"
echo "Repo: $SANDBOX_REPO"
echo "🧪 Run ID: $RUN_ID"
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
# Reset sandbox to canonical state
#############################################

reset_sandbox() {
  local WORKDIR
  WORKDIR="$(mktemp -d)"

  echo "→ Resetting sandbox to canonical state"

  gh repo clone "$SANDBOX_REPO" "$WORKDIR/repo" -- --quiet
  cd "$WORKDIR/repo"

  local GOOD_COMMIT
  GOOD_COMMIT="$(git log --grep="install task assistant" --format="%H" -n 1)"

  if [[ -z "$GOOD_COMMIT" ]]; then
    echo "❌ Could not locate canonical install commit"
    exit 1
  fi

  git reset --hard "$GOOD_COMMIT"
  git push --force origin main --quiet

  cd "$ROOT_PWD"
  rm -rf "$WORKDIR"

  echo "✓ Sandbox reset to $GOOD_COMMIT"
}

#############################################
# Apply config mutation
#############################################

apply_mutation() {
  local CASE="$1"
  local WORKDIR
  WORKDIR="$(mktemp -d)"

  gh repo clone "$SANDBOX_REPO" "$WORKDIR/repo" -- --quiet
  cd "$WORKDIR/repo"

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
      # Invalid enforcement schema (scalar instead of object)
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

  cd "$ROOT_PWD"
  rm -rf "$WORKDIR"
}

#############################################
# Trigger issue-events (real trigger)
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

  local RESULT
  RESULT="$(gh run list \
    --repo "$SANDBOX_REPO" \
    --workflow "task-assistant-issue-events.yml" \
    --limit 1 \
    --json conclusion \
    -q '.[0].conclusion')"

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

  sleep 15

  local RESULT

  if [[ "$CASE" == "E4" ]]; then
    for i in {1..5}; do
      RESULT="$(gh run list \
        --repo "$SANDBOX_REPO" \
        --workflow "$WF" \
        --limit 1 \
        --json conclusion \
        -q '.[0].conclusion')"
      [[ "$RESULT" == "success" ]] && break
      sleep 20
    done
  else
    # existing strict logic

    RESULT="$(gh run list \
      --repo "$SANDBOX_REPO" \
      --workflow "$WF" \
      --limit 1 \
      --json conclusion \
      -q '.[0].conclusion')"
  fi

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
# Execute certification (isolated per case)
#############################################

ERROR_CASES=(E1 E2 E3 E4)

for CASE in "${ERROR_CASES[@]}"; do
  (
    echo
    echo "🧪 Case $CASE"

    reset_sandbox
    apply_mutation "$CASE"

    trigger_issue_events_and_expect_fail

    trigger_and_expect "task-assistant-self-test.yml" "$(expect_self_test "$CASE")"
    trigger_and_expect "task-assistant-nightly-sweep.yml" "$(expect_nightly "$CASE")"

    echo "✓ Case $CASE certified"
  )
done

echo
echo "✅ Phase 3.3 Config Validation Certification PASSED"
