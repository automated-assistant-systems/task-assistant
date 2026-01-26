#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Task Assistant — Enforcement Validation (Event-Driven)
# ============================================================

: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required (owner/repo)}"

REPO="$GITHUB_REPOSITORY"
OWNER="${REPO%%/*}"
NAME="${REPO##*/}"
CORRELATION_ID="enforce-test-$(date +%s)"

echo
echo "🛡️ Task Assistant — Enforcement Validation (Event-Driven)"
echo "Repo:           $REPO"
echo "Correlation ID: $CORRELATION_ID"
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
# Apply conflicting labels (this SHOULD trigger enforcement)
# ------------------------------------------------------------
echo "→ Applying conflicting phase labels (should auto-trigger enforcement)…"

gh issue edit "$ISSUE_NUMBER" \
  --repo "$REPO" \
  --add-label "phase-3.4" \
  --add-label "phase-3.5"

echo "✓ Labels applied — waiting for enforcement"

# ------------------------------------------------------------
# Wait for enforcement to run
# ------------------------------------------------------------
echo "→ Waiting for enforcement execution…"
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
# Verify enforcement telemetry
# ------------------------------------------------------------
echo "→ Verifying enforcement telemetry…"

if ! gh api "repos/$OWNER/task-assistant-telemetry/contents/telemetry/events/enforce" \
     >/dev/null 2>&1; then
  echo "::error::Enforcement telemetry not found"
  exit 1
fi

echo "✓ Enforcement telemetry present"

# ------------------------------------------------------------
# Verify dashboard telemetry NOT emitted
# ------------------------------------------------------------
echo "→ Verifying dashboard telemetry absence…"

if gh api "repos/$OWNER/task-assistant-telemetry/contents/telemetry/dashboard" \
     >/dev/null 2>&1; then
  echo "::error::Dashboard telemetry must NOT be emitted for enforcement"
  exit 1
fi

echo "✓ No dashboard telemetry emitted"

# ------------------------------------------------------------
# Success
# ------------------------------------------------------------
echo
echo "✅ Enforcement validation PASSED"
echo "   • Event-driven enforcement confirmed"
echo "   • Issue mutation verified"
echo "   • Telemetry emitted correctly"
echo "   • Dashboard isolation preserved"
echo
