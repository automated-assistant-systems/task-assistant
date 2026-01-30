#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Phase 3.4 — Operator Matrix Orchestrator (Test-Aware)
#
# • Resets ONLY repos used by the selected test
# • Assumes sandbox repos already exist
# • Never runs inside CI
# ============================================================

if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  echo "❌ run-matrix-tests.sh is operator-only"
  exit 1
fi

TEST_SET="${1:-all}"

case "$TEST_SET" in
  all)
    REPOS=(
      automated-assistant-systems/task-assistant-sandbox
      garybayes/ta-marketplace-install-test
    )
    ;;
  test-03-multi-org)
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
    echo "Usage: run-matrix-tests.sh [all|test-03-multi-org|test-06-multi-repo|test-07-multi-org+repo]"
    exit 1
    ;;
esac

echo
echo "🧹 Phase 3.4 — Pre-resetting sandbox repos"
echo "Test set: $TEST_SET"
echo

for repo in "${REPOS[@]}"; do
  echo "→ Resetting $repo"
  scripts/sandbox/reset-sandbox.sh "$repo" --reset-telemetry
done

echo
echo "✓ Required sandboxes reset"
echo

echo "🚀 Triggering Phase 3.4 matrix workflow"
echo

gh workflow run phase-3.4-matrix.yml \
  --repo automated-assistant-systems/task-assistant \
  -f test_set="$TEST_SET"

echo
echo "✓ Matrix workflow triggered"

