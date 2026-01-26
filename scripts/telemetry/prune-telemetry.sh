#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-}"
DATE="${2:-}"

if [[ -z "$REPO" || -z "$DATE" ]]; then
  echo "Usage: prune-telemetry.sh <repo-name> <YYYY-MM-DD>"
  exit 1
fi

: "${TELEMETRY_REPO:?TELEMETRY_REPO must be set (org/repo)}"

BASE_PATH="telemetry/v1/repos/$REPO/$DATE"

echo "🧹 Pruning telemetry for partial recovery test"
echo "Repo:          $REPO"
echo "Date:          $DATE"
echo "Telemetry repo:$TELEMETRY_REPO"
echo

FILES="$(gh api repos/$TELEMETRY_REPO/contents/$BASE_PATH --jq '.[].name' | sort)"

if [[ -z "$FILES" ]]; then
  echo "❌ No telemetry files found at $BASE_PATH"
  exit 1
fi

echo "Found telemetry files:"
echo "$FILES"
echo

KEEP="$(echo "$FILES" | head -n 1)"
DELETE="$(echo "$FILES" | tail -n +2)"

echo "✓ Preserving correlation file:"
echo "  $KEEP"
echo

for f in $DELETE; do
  echo "→ Deleting $f"
  gh api -X DELETE \
    "repos/$TELEMETRY_REPO/contents/$BASE_PATH/$f" \
    -f message="test: prune telemetry for partial recovery"
done

echo
echo "✔ Telemetry pruned"
echo "✔ One correlation preserved for recovery validation"
