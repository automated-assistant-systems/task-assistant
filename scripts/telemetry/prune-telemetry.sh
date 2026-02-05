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

FILES_JSON="$(gh api repos/$TELEMETRY_REPO/contents/$BASE_PATH)"
FILES="$(echo "$FILES_JSON" | jq -r '.[].name' | sort)"

if [[ -z "$FILES" ]]; then
  echo "❌ No telemetry files found at $BASE_PATH"
  exit 1
fi

echo "Found telemetry files:"
echo "$FILES"
echo

KEEP="$(echo "$FILES" | head -n 1)"

echo "✓ Preserving correlation file:"
echo "  $KEEP"
echo

for dir in $(echo "$FILES" | tail -n +2); do
  echo "→ Pruning correlation directory: $dir"

  # List files inside the correlation directory
  FILES_IN_DIR_JSON="$(gh api repos/$TELEMETRY_REPO/contents/$BASE_PATH/$dir)"

  for file in $(echo "$FILES_IN_DIR_JSON" | jq -r '.[] | select(.type=="file") | .name'); do
    # Optionally preserve .keep
    if [[ "$file" == ".keep" ]]; then
      echo "  ↳ preserving $dir/.keep"
      continue
    fi

    SHA="$(echo "$FILES_IN_DIR_JSON" | jq -r ".[] | select(.name==\"$file\") | .sha")"

    echo "  ↳ deleting $dir/$file"
    gh api -X DELETE \
      "repos/$TELEMETRY_REPO/contents/$BASE_PATH/$dir/$file" \
      -f message="test: prune telemetry for partial recovery" \
      -f sha="$SHA" \
      >/dev/null
  done
done

echo
echo "✔ Telemetry pruned"
echo "✔ One correlation preserved for recovery validation"
echo
