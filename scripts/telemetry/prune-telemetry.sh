#!/usr/bin/env bash
set -euo pipefail

REPO="$1"

if [[ -z "$REPO" ]]; then
  echo "Usage: prune-telemetry.sh <repo-name>"
  exit 1
fi

: "${TELEMETRY_REPO:?TELEMETRY_REPO must be set (org/repo)}"

BASE_PATH="telemetry/v1/repos/$REPO"

echo "🧹 Pruning telemetry for repo: $REPO"
echo "Telemetry repo: $TELEMETRY_REPO"
echo

FILES="$(gh api repos/$TELEMETRY_REPO/contents/$BASE_PATH --jq '.[].name' | sort)"

KEEP="$(echo "$FILES" | head -n 1)"
DELETE="$(echo "$FILES" | tail -n +2)"

if [[ -z "$KEEP" ]]; then
  echo "❌ No telemetry files found for $REPO"
  exit 1
fi

echo "✓ Keeping: $KEEP"

for f in $DELETE; do
  echo "→ Deleting $f"
  gh api -X DELETE \
    repos/$TELEMETRY_REPO/contents/$BASE_PATH/$f \
    -f message="test: prune telemetry for partial recovery"
done

echo
echo "✔ Telemetry pruned — partial data preserved"

