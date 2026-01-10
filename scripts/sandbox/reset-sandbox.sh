#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-}"

if [[ -z "$REPO" ]]; then
  echo "Usage: scripts/sandbox/reset-sandbox.sh <owner/repo>"
  exit 1
fi

command -v gh >/dev/null || { echo "Missing dependency: gh"; exit 1; }
command -v jq >/dev/null || { echo "Missing dependency: jq"; exit 1; }

echo "🧹 Resetting sandbox to known baseline"
echo "Repo: $REPO"
echo

# Ensure gh auth is OK
gh auth status >/dev/null 2>&1 || {
  echo "❌ gh is not authenticated. Run: gh auth login"
  exit 1
}

# 1) Close all open issues (keep history, avoid deletion)
echo "→ Closing open issues..."
OPEN_ISSUES_JSON="$(gh issue list --repo "$REPO" --state open --limit 200 --json number,title || echo '[]')"
OPEN_NUMBERS="$(echo "$OPEN_ISSUES_JSON" | jq -r '.[].number')"

if [[ -n "$OPEN_NUMBERS" ]]; then
  while IFS= read -r n; do
    [[ -z "$n" ]] && continue
    gh issue close "$n" --repo "$REPO" --comment "Phase 3.2 reset baseline" >/dev/null
    echo "✓ Closed issue $REPO#$n"
  done <<< "$OPEN_NUMBERS"
else
  echo "✓ No open issues"
fi

# 2) Delete labels that we intentionally allow prepare-repo to recreate:
#    - phase-* labels
#    - track/* labels
echo
echo "→ Deleting phase-* and track/* labels..."
LABELS_JSON="$(gh label list --repo "$REPO" --limit 200 --json name || echo '[]')"
LABELS_TO_DELETE="$(echo "$LABELS_JSON" | jq -r '.[].name' | grep -E '^(phase-|track/)' || true)"

if [[ -n "$LABELS_TO_DELETE" ]]; then
  while IFS= read -r lbl; do
    [[ -z "$lbl" ]] && continue
    gh label delete "$lbl" --repo "$REPO" --yes >/dev/null || true
    echo "✓ Label \"$lbl\" deleted from $REPO"
  done <<< "$LABELS_TO_DELETE"
else
  echo "✓ No phase/track labels to delete"
fi

# 3) Delete all milestones (we want prepare-repo to recreate canonical phase milestones)
echo
echo "→ Deleting milestones..."
MILESTONES_JSON="$(gh api "repos/$REPO/milestones?state=all&per_page=100" --paginate || echo '[]')"
MILESTONE_NUMBERS="$(echo "$MILESTONES_JSON" | jq -r '.[].number' || true)"

if [[ -n "$MILESTONE_NUMBERS" ]]; then
  while IFS= read -r mnum; do
    [[ -z "$mnum" ]] && continue
    gh api -X DELETE "repos/$REPO/milestones/$mnum" >/dev/null || true
    echo "✓ Deleted milestone #$mnum"
  done <<< "$MILESTONE_NUMBERS"
else
  echo "✓ No milestones to delete"
fi

echo
echo "✔ Sandbox reset complete"

