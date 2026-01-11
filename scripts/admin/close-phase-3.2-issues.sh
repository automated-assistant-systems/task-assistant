#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Phase 3.2 Issue Close-Out Script
# ─────────────────────────────────────────────
# Safely closes or relabels Phase 3.2 issues
# based on completed certification evidence.
#
# Requirements:
#   - gh CLI authenticated
#   - jq installed
#
# Usage:
#   ./close-phase-3.2-issues.sh owner/repo
# ─────────────────────────────────────────────

REPO="${1:-}"

if [[ -z "$REPO" ]]; then
  echo "Usage: close-phase-3.2-issues.sh <owner/repo>"
  exit 1
fi

command -v gh >/dev/null || { echo "❌ gh not found"; exit 1; }
command -v jq >/dev/null || { echo "❌ jq not found"; exit 1; }

echo "🔐 Phase 3.2 Issue Close-Out"
echo "Repo: $REPO"
echo

# ─────────────────────────────────────────────
# Canonical comments
# ─────────────────────────────────────────────

COMMENT_RESOLVED=$(
cat <<'EOF'
✅ **Resolved in Phase 3.2**

This issue is functionally resolved and was validated during the Phase 3.2
sandbox certification run.

Enforcement logic, telemetry emission, and recovery behavior were exercised
and verified end-to-end.

Closing as **implemented and certified**.
EOF
)

COMMENT_SUPERSEDED=$(
cat <<'EOF'
✅ **Superseded by Phase 3.2 Architecture**

The ambiguity or gap described here has been eliminated by the finalized
Phase 3.2 enforcement and telemetry model.

Schema, runtime behavior, and validation are now aligned and certified.

Closing as **architecturally resolved**.
EOF
)

COMMENT_DEFERRED=$(
cat <<'EOF'
➡️ **Deferred to Phase 3.3**

Core enforcement correctness was delivered in Phase 3.2 and validated.

Remaining work is UX / operator-experience oriented and will be addressed
explicitly in Phase 3.3.

Closing this issue in Phase 3.2 scope.
EOF
)

# ─────────────────────────────────────────────
# Issue classification (EDIT IF NEEDED)
# ─────────────────────────────────────────────

# Implemented & certified → close
RESOLVED_ISSUES=(
  7
  10
  11
  12
  33
  37
)

# Architecturally superseded → close
SUPERSEDED_ISSUES=(
  23
  30
  35
  36
)

# Legitimate UX follow-ups → relabel + close
DEFERRED_ISSUES=(
  # Add issue numbers here if needed
)

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

close_issue() {
  local issue="$1"
  local comment="$2"

  echo "→ Closing issue #$issue"
  gh issue comment "$issue" --repo "$REPO" --body "$comment"
  gh issue close "$issue" --repo "$REPO"
}

defer_issue() {
  local issue="$1"

  echo "→ Deferring issue #$issue to Phase 3.3"
  gh issue comment "$issue" --repo "$REPO" --body "$COMMENT_DEFERRED"

  gh issue edit "$issue" --repo "$REPO" \
    --remove-label "phase-3.2" \
    --add-label "phase-3.3"

  gh issue close "$issue" --repo "$REPO"
}

# ─────────────────────────────────────────────
# Execute
# ─────────────────────────────────────────────

echo "🔹 Closing resolved issues..."
for i in "${RESOLVED_ISSUES[@]}"; do
  close_issue "$i" "$COMMENT_RESOLVED"
done

echo
echo "🔹 Closing superseded issues..."
for i in "${SUPERSEDED_ISSUES[@]}"; do
  close_issue "$i" "$COMMENT_SUPERSEDED"
done

if [[ "${#DEFERRED_ISSUES[@]}" -gt 0 ]]; then
  echo
  echo "🔹 Deferring issues to Phase 3.3..."
  for i in "${DEFERRED_ISSUES[@]}"; do
    defer_issue "$i"
  done
fi

echo
echo "🏁 Phase 3.2 issue close-out complete"

