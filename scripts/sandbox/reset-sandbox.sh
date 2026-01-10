#!/usr/bin/env bash
set -euo pipefail

REPO="$1"

if [[ -z "$REPO" ]]; then
  echo "Usage: reset-sandbox.sh <owner/repo>"
  exit 1
fi

echo "🔄 Resetting sandbox repo: $REPO"

# ─────────────────────────────────────────────
# Labels to remove (non-system)
# ─────────────────────────────────────────────
LABELS_TO_DELETE=$(gh label list --repo "$REPO" --json name \
  | jq -r '.[].name' \
  | grep -E '^phase-|^track/|^telemetry|^enforcement|^quality-gate|^marketplace' \
  || true)

for label in $LABELS_TO_DELETE; do
  echo "🗑️ Removing label: $label"
  gh label delete "$label" --repo "$REPO" --yes || true
done

# ─────────────────────────────────────────────
# Milestones to remove
# ─────────────────────────────────────────────
MILESTONES=$(gh api repos/$REPO/milestones --json title,number \
  | jq -r '.[] | .number')

for m in $MILESTONES; do
  echo "🗑️ Removing milestone #$m"
  gh api repos/$REPO/milestones/$m -X DELETE || true
done

# ─────────────────────────────────────────────
# Issues: clear labels & milestones
# ─────────────────────────────────────────────
ISSUES=$(gh issue list --repo "$REPO" --json number \
  | jq -r '.[].number')

for i in $ISSUES; do
  echo "🧹 Clearing issue #$i"
  gh issue edit "$i" --repo "$REPO" --milestone "" || true
  gh issue edit "$i" --repo "$REPO" --remove-label "*" || true
done

echo "✅ Sandbox reset complete"
