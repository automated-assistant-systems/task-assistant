#!/usr/bin/env bash
set -euo pipefail

REPO="$1"

if [[ -z "$REPO" ]]; then
  echo "Usage: validate-phase-3.2.sh <owner/repo>"
  exit 1
fi

OWNER=$(echo "$REPO" | cut -d/ -f1)
NAME=$(echo "$REPO" | cut -d/ -f2)

echo "📡 Running Phase 3.2 validation for $REPO"

# ─────────────────────────────────────────────
# 1. Self-Test
# ─────────────────────────────────────────────
echo "▶️ Triggering self-test"
gh workflow run task-assistant-self-test.yml --repo "$REPO"

sleep 10

# ─────────────────────────────────────────────
# 2. Create issue to test enforcement
# ─────────────────────────────────────────────
ISSUE_NUMBER=$(gh issue create \
  --repo "$REPO" \
  --title "Phase 3.2 Validation Issue" \
  --body "Used to validate phase enforcement" \
  --label phase-3.2 \
  --json number \
  | jq -r '.number')

echo "🧩 Created issue #$ISSUE_NUMBER"

sleep 5

# Escalate phase
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label phase-3.4

sleep 10

# ─────────────────────────────────────────────
# 3. Nightly Sweep
# ─────────────────────────────────────────────
echo "🌙 Triggering nightly sweep"
gh workflow run task-assistant-nightly-sweep.yml --repo "$REPO"

echo
echo "✅ Phase 3.2 validation executed"
echo
echo "🔎 Telemetry proof locations:"
echo "telemetry/v1/repos/$NAME/YYYY-MM-DD.jsonl"
echo "telemetry/v1/meta/YYYY-MM-DD.jsonl (read-only aggregation)"
