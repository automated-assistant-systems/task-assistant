#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Task Assistant — Enforcement Validation (Event-Driven)
#
# Purpose:
#   Prove that invalid issue state is automatically corrected
#   via event-driven enforcement.
#
# Notes:
#   • No correlation IDs are generated or passed
#   • Telemetry is verified separately via evidence collection
# ============================================================

: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required (owner/repo)}"

REPO="$GITHUB_REPOSITORY"
OWNER="${REPO%%/*}"
NAME="${REPO##*/}"

echo
echo "🛡️ Task Assistant — Enforcement Validation"
echo "Repo: $REPO"
echo

# ------------------------------------------------------------
# Sandbox guardrail
# ------------------------------------------------------------
if [[ "$NAME" != *sandbox* ]]; then
  echo "::error::Refusing to run enforcement validation on non-sandbox repo"
  exit 1
fi

# ------------------------------------------------------------
# Create invalid issue
# ------------------------------------------------------------
echo "→ Creating invalid issue…"

ISSUE_URL="$(
  gh issue create \
    --repo "$REPO" \
    --title "Enforcement Test — Invalid Phase State" \
    --body "This issue intentionally violates enforcement rules."
)"

ISSUE_NUMBER="${ISSUE_URL##*/}"
echo "✓ Issue #$ISSUE_NUMBER created"

# ------------------------------------------------------------
# Apply conflicting labels (should trigger enforcement)
# ------------------------------------------------------------
echo "→ Applying conflicting phase labels…"

gh issue edit "$ISSUE_NUMBER" \
  --repo "$REPO" \
  --add-label "phase-3.4" \
  --add-label "phase-3.5"

echo "✓ Labels applied — waiting for enforcement"

# ------------------------------------------------------------
# Wait for enforcement
# ------------------------------------------------------------
sleep 30

# ------------------------------------------------------------
# Verify issue mutation
# ------------------------------------------------------------
echo "→ Verifying issue state…"

LABELS="$(
  gh issue view "$ISSUE_NUMBER" \
    --repo "$REPO" \
    --json labels \
    | jq -r '.labels[].name'
)"

if echo "$LABELS" | grep -q "phase-3.4" && echo "$LABELS" | grep -q "phase-3.5"; then
  echo "::error::Enforcement failed — conflicting labels still present"
  exit 1
fi

echo "✓ Enforcement resolved conflicting labels"

# ------------------------------------------------------------
# Success
# ------------------------------------------------------------
echo
echo "✅ Enforcement validation PASSED"
echo "   • Event-driven enforcement confirmed"
echo "   • Final issue state is valid"
