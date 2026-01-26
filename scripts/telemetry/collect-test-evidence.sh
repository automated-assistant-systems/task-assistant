#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Collect Phase 3.4 validation evidence
#
# Usage:
#   TELEMETRY_REPO=<org>/<repo> \
#   ./scripts/telemetry/collect-test-evidence.sh <target-repo> [output-file]
#
# Example:
#   TELEMETRY_REPO=garybayes/task-assistant-telemetry \
#   ./scripts/telemetry/collect-test-evidence.sh ta-sandbox \
#     docs/validation/results/phase-3.4-test-11.json
# ─────────────────────────────────────────────

REPO="${1:-}"
OUT="${2:-}"

: "${TELEMETRY_REPO:?TELEMETRY_REPO must be set}"

if [[ -z "$REPO" ]]; then
  echo "Usage: collect-test-evidence.sh <repo> [output-file]"
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEFAULT_OUT="test-evidence-${REPO}-${STAMP}.json"
OUT="${OUT:-$DEFAULT_OUT}"

TMP_VALIDATE="$(mktemp)"
TMP_DASHBOARD="$(mktemp)"

trap 'rm -f "$TMP_VALIDATE" "$TMP_DASHBOARD"' EXIT

echo "📦 Collecting Phase 3.4 test evidence"
echo "• Telemetry repo: $TELEMETRY_REPO"
echo "• Target repo:    $REPO"
echo "• Output file:    $OUT"
echo

# ------------------------------------------------------------
# Locate telemetry files
# ------------------------------------------------------------
FILES="$(
  gh api \
    "repos/$TELEMETRY_REPO/contents/telemetry/v1/repos/$REPO" \
    --jq '.[] | select(.name | endswith(".jsonl")) | .name' \
    2>/dev/null || true
)"

if [[ -z "$FILES" ]]; then
  echo "⚠️  No telemetry files found for $REPO"
  jq -n '
    {
      collected_at: now | todate,
      repo: $repo,
      validation: [],
      dashboard: []
    }
  ' --arg repo "$REPO" > "$OUT"
  exit 0
fi

# ------------------------------------------------------------
# Extract validation + dashboard events
# ------------------------------------------------------------
for f in $FILES; do
  CONTENT="$(
    gh api \
      "repos/$TELEMETRY_REPO/contents/telemetry/v1/repos/$REPO/$f" \
      --jq '.content' \
    | base64 --decode
  )"

  echo "$CONTENT" \
    | jq -c 'select(.source.workflow == "engine-validate")' \
    >> "$TMP_VALIDATE" || true

  echo "$CONTENT" \
    | jq -c 'select(.source.workflow == "engine-dashboard")' \
    >> "$TMP_DASHBOARD" || true
done

# ------------------------------------------------------------
# Normalize and write output
# ------------------------------------------------------------
jq -s '
  {
    collected_at: now | todate,
    repo: $repo,
    validation_records: $validation,
    dashboard_records: $dashboard
  }
' \
  --arg repo "$REPO" \
  --slurpfile validation "$TMP_VALIDATE" \
  --slurpfile dashboard "$TMP_DASHBOARD" \
  > "$OUT"

echo "✓ Evidence collected"
echo "✓ Validation records: $(jq '.validation_records | length' "$OUT")"
echo "✓ Dashboard records:  $(jq '.dashboard_records | length' "$OUT")"
echo "✓ Saved to: $OUT"
