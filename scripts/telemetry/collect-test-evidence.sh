#!/usr/bin/env bash
set -euo pipefail

TARGET_REPO="$1"
DATE="$2"
OUT="${3:-}"

if [[ -z "$TARGET_REPO" || -z "$DATE" ]]; then
  echo "Usage: collect-test-evidence.sh <owner/repo> <YYYY-MM-DD> [output-file]"
  exit 1
fi

command -v gh >/dev/null || { echo "❌ gh required"; exit 1; }
gh auth status >/dev/null || { echo "❌ gh not authenticated"; exit 1; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${OUT:-test-evidence-${TARGET_REPO//\//-}-${STAMP}.json}"

echo "🔎 Resolving telemetry repo via infra…"
TELEMETRY_REPO="$(
  GITHUB_TOKEN="$(gh auth token)" \
  node "$ROOT_DIR/scripts/infra/resolve-telemetry-repo.js" "$TARGET_REPO"
)"

BASE_PATH="telemetry/v1/repos/${TARGET_REPO##*/}/$DATE"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

echo
echo "📦 Collecting telemetry evidence"
echo "• Repo:           $TARGET_REPO"
echo "• Telemetry repo: $TELEMETRY_REPO"
echo "• Date scope:     $DATE"
echo "• Output file:    $OUT"
echo

CORR_DIRS="$(gh api "repos/$TELEMETRY_REPO/contents/$BASE_PATH" \
  --jq '.[] | select(.type=="dir") | .name' 2>/dev/null || true)"

if [[ -z "$CORR_DIRS" ]]; then
  echo "⚠️ No correlation directories found"
  jq -n \
    --arg repo "$TARGET_REPO" \
    --arg telemetry "$TELEMETRY_REPO" \
    --arg date "$DATE" \
    '{ collected_at: now | todate, target_repo: $repo, telemetry_repo: $telemetry, date: $date, correlation_ids: [], records: [] }' \
    > "$OUT"
  exit 0
fi

for cid in $CORR_DIRS; do
  gh api "repos/$TELEMETRY_REPO/contents/$BASE_PATH/$cid" \
    --jq '.[] | select(.type=="file") | .path' |
  while read -r path; do
    gh api "repos/$TELEMETRY_REPO/contents/$path" \
      --jq '.content' | base64 --decode >> "$TMP"
  done
done

jq -s \
  --arg repo "$TARGET_REPO" \
  --arg telemetry "$TELEMETRY_REPO" \
  --arg date "$DATE" \
  '{
     collected_at: now | todate,
     target_repo: $repo,
     telemetry_repo: $telemetry,
     date: $date,
     correlation_ids: (map(.correlation_id) | unique),
     records: .
   }' "$TMP" > "$OUT"

echo "✓ Evidence collected"
echo "✓ Records: $(jq '.records | length' "$OUT")"
echo "✓ Correlation IDs: $(jq '.correlation_ids | length' "$OUT")"
echo "✓ Saved to: $OUT"
