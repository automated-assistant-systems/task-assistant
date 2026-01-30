#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Task Assistant — Phase 3.4 Validation Runner
#
# Behavior:
#   • Operator run (local): full flow including reset
#   • GitHub Actions: skips reset-sandbox automatically
#
# Usage:
#   run-validation-test.sh <test-id> <owner/repo>
# ============================================================

TEST_ID="${1:-}"
TARGET_REPO="${2:-}"

if [[ -z "$TEST_ID" || -z "$TARGET_REPO" ]]; then
  echo "Usage: run-validation-test.sh <test-id> <owner/repo>"
  exit 1
fi

RESULTS_DIR="docs/validation/results/$TEST_ID"
mkdir -p "$RESULTS_DIR"

OUT_FILE="$RESULTS_DIR/${TARGET_REPO//\//-}.json"

echo
echo "🧪 Phase 3.4 Validation Matrix"
echo "Test ID:     $TEST_ID"
echo "Target repo: $TARGET_REPO"
echo "Output:      $OUT_FILE"
echo

# ------------------------------------------------------------
# Reset sandbox (operator-only)
# ------------------------------------------------------------
if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  echo "ℹ️  Running in GitHub Actions — skipping sandbox reset"
else
  echo "🧹 Resetting sandbox..."
  scripts/sandbox/reset-sandbox.sh "$TARGET_REPO" --reset-telemetry
fi

# ------------------------------------------------------------
# Install Task Assistant
# ------------------------------------------------------------
echo
echo "📦 Installing Task Assistant..."
scripts/sandbox/install-task-assistant.sh "$TARGET_REPO"

# ------------------------------------------------------------
# Prepare repo (idempotent, safe in CI)
# ------------------------------------------------------------
echo
echo "🏗️ Preparing repo..."
node scripts/prepare-repo.js "$TARGET_REPO"

# ------------------------------------------------------------
# Verification (self-test + validate)
# ------------------------------------------------------------
echo
scripts/onboarding/verify-repo.sh "$TARGET_REPO"

# ------------------------------------------------------------
# Enforcement validation
# ------------------------------------------------------------
echo
scripts/validate/validate-enforcement.sh "$TARGET_REPO"

# ------------------------------------------------------------
# Collect telemetry evidence
# ------------------------------------------------------------
echo
echo "📤 Collecting telemetry evidence..."
scripts/telemetry/collect-test-evidence.sh \
  "$TARGET_REPO" \
  "$(date -u +%Y-%m-%d)" \
  "$OUT_FILE"

echo
echo "✅ Phase 3.4 test $TEST_ID complete"
echo "📄 Evidence saved to:"
echo "   $OUT_FILE"
