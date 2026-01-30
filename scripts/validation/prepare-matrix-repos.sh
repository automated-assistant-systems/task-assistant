#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Phase 3.4 — Operator Repo Prep + Matrix Trigger
#
# • Operator-only (never CI)
# • Performs all mutation BEFORE concurrency
# • Resets ONLY repos used by the selected test
# • Verifies install + config (self-test + validate)
# • Triggers matrix workflow after prep
# ============================================================

if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  echo "❌ prepare-matrix-repos.sh is operator-only"
  exit 1
fi

TEST_SET="${1:-all}"

case "$TEST_SET" in
  all|test-03-multi-org)
    REPOS=(
      automated-assistant-systems/task-assistant-sandbox
      garybayes/ta-marketplace-install-test
    )
    ;;
  test-06-multi-repo)
    REPOS=(
      garybayes/ta-marketplace-install-test
      garybayes/ta-sandbox
    )
    ;;
  test-07-multi-org+repo)
    REPOS=(
      automated-assistant-systems/task-assistant-sandbox
      garybayes/ta-marketplace-install-test
      garybayes/ta-sandbox
    )
    ;;
  *)
    echo "Usage: prepare-matrix-repos.sh [all|test-03-multi-org|test-06-multi-repo|test-07-multi-org+repo]"
    exit 1
    ;;
esac

echo
echo "🧹 Phase 3.4 — Preparing sandbox repos"
echo "Test set: $TEST_SET"
echo

for repo in "${REPOS[@]}"; do
  echo "────────────────────────────────────────────"
  echo "▶ Preparing $repo"
  echo

  echo "→ Resetting sandbox"
  scripts/sandbox/reset-sandbox.sh "$repo" --reset-telemetry

  echo
  echo "→ Installing Task Assistant"
  scripts/sandbox/install-task-assistant.sh "$repo"

  echo
  echo "→ Preparing repo (labels & milestones)"
  node scripts/prepare-repo.js "$repo"

  echo
  echo "→ Running self-test (dispatch & wiring check)"
  TARGET_REPO="$repo" scripts/dispatch/run-self-test.sh "$repo"

  echo
  echo "→ Running config validation"
  TARGET_REPO="$repo" scripts/dispatch/run-validate.sh "$repo"

  echo
  echo "✓ $repo ready for matrix enforcement"
  echo
done

echo "✓ All required repos prepared and verified"
echo
echo "🚀 Triggering Phase 3.4 matrix workflow"
echo

gh workflow run phase-3.4-matrix.yml \
  --repo automated-assistant-systems/task-assistant \
  -f test_set="$TEST_SET"

echo
echo "✓ Matrix workflow triggered"
