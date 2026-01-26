#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Phase 3.4 — Validation Test Wrapper (Authoritative)
#
# Executes the full Phase 3.4 validation matrix:
#   prepare → self-test → validate → enforce → validate → evidence
#
# Usage:
#   scripts/validation/run-validation-test.sh <test-id> <owner/repo>
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

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RESULTS_DIR="$ROOT_DIR/docs/validation/results/$TEST_ID"
OUT_FILE="$RESULTS_DIR/${OWNER}-${REPO}.json"

VERIFY_REPO="$ROOT_DIR/scripts/onboarding/verify-repo.sh"
RUN_ENFORCEMENT="$ROOT_DIR/scripts/validate/validate-enforcement.sh"

mkdir -p "$RESULTS_DIR"

echo
echo "🧪 Phase 3.4 Validation Matrix"
echo "Test ID:     $TEST_ID"
echo "Target repo: $TARGET_REPO"
echo "Output:      $OUT_FILE"
echo

# ------------------------------------------------------------
# 1. Reset sandbox (including telemetry)
# ------------------------------------------------------------
echo "🧹 Resetting sandbox..."
"$ROOT_DIR/scripts/sandbox/reset-sandbox.sh" \
  "$TARGET_REPO" \
  --reset-telemetry

# ------------------------------------------------------------
# 2. Install Task Assistant
# ------------------------------------------------------------
echo
echo "📦 Installing Task Assistant..."
"$ROOT_DIR/scripts/sandbox/install-task-assistant.sh" \
  "$TARGET_REPO"

# ------------------------------------------------------------
# 3. Prepare repo
# ------------------------------------------------------------
echo
echo "🏗️ Preparing repo..."
GH_TOKEN="$GH_TOKEN" \
node "$ROOT_DIR/scripts/prepare-repo.js" "$TARGET_REPO"

# ------------------------------------------------------------
# 4. Post-prepare integrity verification
# ------------------------------------------------------------
echo
echo "🔍 Verifying integrity (post-prepare)..."
"$VERIFY_REPO" "$REPO" prepare

# ------------------------------------------------------------
# 5. Enforcement validation
# ------------------------------------------------------------
echo
echo "⚖️ Running enforcement validation..."
"$RUN_ENFORCEMENT" "$TARGET_REPO"

# ------------------------------------------------------------
# 6. Post-enforcement validation
# ------------------------------------------------------------
echo
echo "🔍 Validating repo (post-enforcement)..."
"$VERIFY_REPO" "$REPO" enforce

# ------------------------------------------------------------
# 7. Collect telemetry evidence
# ------------------------------------------------------------
echo
echo "📤 Collecting telemetry evidence..."

DATE="$(date -u +%Y-%m-%d)"

"$ROOT_DIR/scripts/telemetry/collect-test-evidence.sh" \
  "$TARGET_REPO" \
  "$DATE" \
  "$OUT_FILE"

echo
echo "✅ Phase 3.4 test $TEST_ID complete"
echo "📄 Evidence saved to:"
echo "   $OUT_FILE"
