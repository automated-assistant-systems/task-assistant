#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Phase 3.4 — Telemetry Evidence Collection
#
# This script:
#   • Resolves telemetry repo via infra (lib/infra.ts)
#   • Assumes operator has gh auth access
#   • Collects immutable per-engine telemetry
#
# Usage:
#   scripts/telemetry/collect-test-evidence.sh \
#     <owner/repo> <YYYY-MM-DD> [output-file]
# ─────────────────────────────────────────────

TARGET_REPO="${1:-}"
DATE="${2:-}"
OUT="${3:-}"

if [[ -z "$TARGET_REPO" || -z "$DATE" ]]; then
  echo "Usage: collect-test-evidence.sh <owner/repo> <YYYY-MM-DD> [output-file]"
  exit 1
fi

# ------------------------------------------------------------
# Preconditions
# ------------------------------------------------------------
command -v gh >/dev/null || {
  echo "❌ gh CLI is required"
  exit 1
}

gh auth status >/dev/null 2>&1 || {
  echo "❌ gh is not authenticated"
  echo "   Run: gh auth login"
  exit 1
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEFAULT_OUT="test-evidence-${TARGET_REPO//\//-}-${DATE}-${STAMP}.json"
OUT="${OUT:-$DEFAULT_OUT}"

# ------------------------------------------------------------
# Resolve telemetry repo via infra
# ------------------------------------------------------------
echo "🔎 Resolving telemetry repo via infra…"

TELEMETRY_REPO="$(
  GITHUB_TOKEN="$(gh auth token)" \
  node "$ROOT_DIR/scripts/infra/resolve-telemetry-repo.js" "$TARGET_REPO" \
  2>/tmp/infra-error.log || true
)"

if [[ -z "$TELEMETRY_REPO" ]]; then
  echo "❌ Failed to resolve telemetry repo for $TARGET_REPO"
  echo
  echo "Details:"
  sed 's/^/  /' /tmp/infra-error.log || true
  echo
  echo "This means:"
  echo "  • The repo is not registered in infra v2 or v1, OR"
  echo "  • Your gh identity cannot read task-assistant-infra"
  echo
  echo "Phase 3.4 requires telemetry routing to be explicit."
  exit 1
fi

echo "✓ Telemetry repo: $TELEMETRY_REPO"

BASE_PATH="telemetry/v1/repos/${TARGET_REPO##*/}/$DATE"

TMP_ALL="$(mktemp)"
trap 'rm -f "$TMP_ALL"' EXIT

echo
echo "📦 Collecting telemetry evidence"
echo "• Target repo:    $TARGET_REPO"
echo "• Telemetry repo: $TELEMETRY_REPO"
echo "• Date scope:     $DATE"
echo "• Output file:    $OUT"
echo

# ------------------------------------------------------------
# List telemetry files
# ------------------------------------------------------------
FILES="$(
  gh api \
    "repos/$TELEMETRY_REPO/contents/$BASE_PATH" \
    --jq '.[] | select(.name | endswith(".json")) | .name' \
    2>/dev/null || true
)"

if [[ -z "$FILES" ]]; then
  echo "⚠️  No telemetry files found at:"
  echo "   $TELEMETRY_REPO/$BASE_PATH"
  echo
  echo "This usually means:"
  echo "  • Engines did not run, OR"
  echo "  • Telemetry was not emitted, OR"
  echo "  • The date is incorrect"
  echo

  jq -n '
    {
      collected_at: now | todate,
      target_repo: $repo,
      telemetry_repo: $telemetry,
      date: $date,
      correlation_ids: [],
      records: []
    }
  ' \
    --arg repo "$TARGET_REPO" \
    --arg telemetry "$TELEMETRY_REPO" \
    --arg date "$DATE" \
    > "$OUT"

  echo "✓ Empty evidence file written"
  exit 0
fi

echo "Found telemetry files:"
echo "$FILES"
echo

# ------------------------------------------------------------
# Fetch and aggregate telemetry
# ------------------------------------------------------------
for f in $FILES; do
  gh api \
    "repos/$TELEMETRY_REPO/contents/$BASE_PATH/$f" \
    --jq '.content' \
    | base64 --decode \
    >> "$TMP_ALL"
done

jq -s '
  {
    collected_at: now | todate,
    target_repo: $repo,
    telemetry_repo: $telemetry,
    date: $date,
    correlation_ids: (
      map(.correlation_id) | unique
    ),
    records: .
  }
' \
  --arg repo "$TARGET_REPO" \
  --arg telemetry "$TELEMETRY_REPO" \
  --arg date "$DATE" \
  "$TMP_ALL" \
  > "$OUT"

echo "✓ Evidence collected"
echo "✓ Records:         $(jq '.records | length' "$OUT")"
echo "✓ Correlation IDs: $(jq '.correlation_ids | length' "$OUT")"
echo "✓ Saved to:        $OUT"
