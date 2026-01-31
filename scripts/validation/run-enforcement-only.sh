#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Phase 3.4 — Enforcement-Only Validation
#
# • Safe in CI and locally
# • No resets
# • No installs
# • No repo preparation
# • Tolerates partial access
# ============================================================

TEST_ID="${1:-}"
TARGET_REPO="${2:-}"

if [[ -z "$TEST_ID" || -z "$TARGET_REPO" ]]; then
  echo "Usage: run-enforcement-only.sh <test-id> <owner/repo>"
  exit 1
fi

TARGET_REPO="${TARGET_REPO:-}"
if [[ -z "$TARGET_REPO" ]]; then
  echo "❌ TARGET_REPO is required"
  exit 1
fi

RESULTS_DIR="docs/validation/results/$TEST_ID"
mkdir -p "$RESULTS_DIR"

OUT_FILE="$RESULTS_DIR/${TARGET_REPO//\//-}.json"

echo
echo "🛡️ Phase 3.4 — Enforcement Validation (Matrix-Safe)"
echo "Test ID:     $TEST_ID"
echo "Target repo: $TARGET_REPO"
echo "Output:      $OUT_FILE"
echo

# ------------------------------------------------------------
# Enforcement validation ONLY
# ------------------------------------------------------------
echo "⚖️ Running enforcement validation..."
TARGET_REPO="$TARGET_REPO" scripts/validate/validate-enforcement.sh

# ------------------------------------------------------------
# Post-enforcement validation (must remain non-mutating)
# ------------------------------------------------------------
echo
echo "🔍 Validating repo state post-enforcement..."

echo
echo "→ Running config validation"
TARGET_REPO="$TARGET_REPO" scripts/dispatch/run-validate.sh

echo "✓ Repo remains valid after enforcement"

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
echo "✅ Enforcement-only validation complete"
echo "📄 Evidence saved to:"
echo "   $OUT_FILE"
