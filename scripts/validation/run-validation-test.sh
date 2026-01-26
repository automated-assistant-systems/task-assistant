#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Phase 3.4 — Validation Test Wrapper
#
# Usage:
#   scripts/validation/run-validation-test.sh <test-id> <owner/repo>
#
# Example:
#   scripts/validation/run-validation-test.sh test-3 garybayes/ta-sandbox
# ============================================================

TEST_ID="${1:-}"
TARGET_REPO="${2:-}"

if [[ -z "$TEST_ID" || -z "$TARGET_REPO" ]]; then
  echo "Usage: $0 <test-id> <owner/repo>"
  exit 1
fi

OWNER="${TARGET_REPO%%/*}"
REPO="${TARGET_REPO##*/}"

# Required env
: "${GH_TOKEN:?GH_TOKEN is required}"
: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RESULTS_DIR="$ROOT_DIR/docs/validation/results/$TEST_ID"
OUT_FILE="$RESULTS_DIR/${OWNER}-${REPO}.json"

mkdir -p "$RESULTS_DIR"

echo
echo "🧪 Phase 3.4 Validation Wrapper"
echo "Test:        $TEST_ID"
echo "Target repo: $TARGET_REPO"
echo "Output:      $OUT_FILE"
echo

# ------------------------------------------------------------
# 1. Reset sandbox (with telemetry reset)
# ------------------------------------------------------------
echo "🧹 Resetting sandbox..."
"$ROOT_DIR/scripts/sandbox/reset-sandbox.sh" \
  "$TARGET_REPO" \
  --reset-telemetry

# ------------------------------------------------------------
# 2. Install Task Assistant (dispatch + config only)
# ------------------------------------------------------------
echo
echo "📦 Installing Task Assistant..."
"$ROOT_DIR/scripts/sandbox/install-task-assistant.sh" \
  "$TARGET_REPO"

# ------------------------------------------------------------
# 3. Prepare repo (labels + milestones)
# ------------------------------------------------------------
echo
echo "🏗️ Preparing repo (labels + milestones)..."
GH_TOKEN="$GH_TOKEN" \
node "$ROOT_DIR/scripts/prepare-repo.js" "$TARGET_REPO"

# ------------------------------------------------------------
# 4. Validation — first run
# ------------------------------------------------------------
echo
echo "🔍 Validation (first run)..."
GITHUB_TOKEN="$GITHUB_TOKEN" \
GITHUB_REPOSITORY="$TARGET_REPO" \
"$ROOT_DIR/scripts/validate/validate-workflows.sh"

# ------------------------------------------------------------
# 5. Validation — second run (no reset)
# ------------------------------------------------------------
echo
echo "🔁 Validation (second run, no reset)..."
GITHUB_TOKEN="$GITHUB_TOKEN" \
GITHUB_REPOSITORY="$TARGET_REPO" \
"$ROOT_DIR/scripts/validate/validate-workflows.sh"

# ------------------------------------------------------------
# 6. Extract validation + dashboard telemetry
# ------------------------------------------------------------
echo
echo "📤 Extracting telemetry evidence..."

"$ROOT_DIR/scripts/telemetry/collect-test-evidence.sh" \
  "$TARGET_REPO" \
  "$OUT_FILE"

echo
echo "✅ Test $TEST_ID complete for $TARGET_REPO"
echo "📄 Results saved to:"
echo "   $OUT_FILE"
echo
