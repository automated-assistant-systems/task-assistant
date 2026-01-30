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
INFRA_JSON="$(
  GITHUB_TOKEN="$(gh auth token)" \
  node scripts/infra/resolve-repo-context.js "$REPO"
)"

CONTEXT="$(jq -r '.context' <<<"$INFRA_JSON")"
STATE="$(jq -r '.state' <<<"$INFRA_JSON")"

if [[ "$CONTEXT" != "sandbox" || "$STATE" != "enabled" ]]; then
  echo "❌ Refusing to reset non-sandbox repo: $REPO"
  echo "   infra context=$CONTEXT state=$STATE"
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
echo "→ Waiting for enforcement to resolve (polling)…"

MAX_WAIT=180   # seconds
INTERVAL=5
ELAPSED=0

while true; do
  LABELS="$(
    gh issue view "$ISSUE_NUMBER" \
      --repo "$REPO" \
      --json labels \
      | jq -r '.labels[].name'
  )"

  if ! (echo "$LABELS" | grep -q "phase-3.4" && echo "$LABELS" | grep -q "phase-3.5"); then
    echo "✓ Enforcement resolved conflicting labels"
    break
  fi

  if (( ELAPSED >= MAX_WAIT )); then
    echo "::error::Enforcement did not resolve within ${MAX_WAIT}s"
    echo "Current labels:"
    echo "$LABELS"
    exit 1
  fi

  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
done

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
