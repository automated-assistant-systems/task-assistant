#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Phase 3.2 Certification Script (Authoritative)
# ─────────────────────────────────────────────

REPO="${1:-}"

if [[ -z "$REPO" ]]; then
  echo "Usage: certify-phase-3.2.sh <owner/repo>"
  exit 1
fi

if [[ -z "${TELEMETRY_REPO:-}" ]]; then
  echo "TELEMETRY_REPO env var must be set"
  exit 1
fi

echo "🔒 Phase 3.2 Certification"
echo "Repo: $REPO"
echo

# ─────────────────────────────────────────────
# 1. Reset sandbox to known state
# ─────────────────────────────────────────────

echo "📄 Installing Phase 3.2 canonical config..."

gh api repos/"$REPO"/contents/.github/task-assistant.yml \
  -X PUT \
  -f message="chore: install Phase 3.2 Task Assistant config" \
  -f content="$(base64 -w0 .github/task-assistant.yml)" \
  -f sha="$(gh api repos/$REPO/contents/.github/task-assistant.yml --jq .sha 2>/dev/null || true)"

echo "🧹 Resetting sandbox state..."

gh issue list --repo "$REPO" --state open --json number \
  | jq -r '.[].number' \
  | xargs -I{} gh issue close {} --repo "$REPO" --comment "Phase 3.2 reset" || true

gh label list --repo "$REPO" --json name \
  | jq -r '.[].name' \
  | grep -E '^(phase-|track/)' \
  | xargs -I{} gh label delete {} --repo "$REPO" --yes || true

gh api repos/"$REPO"/milestones --paginate \
  | jq -r '.[].number' \
  | xargs -I{} gh api -X DELETE repos/"$REPO"/milestones/{} || true

echo "✔ Sandbox reset complete"
echo

# ─────────────────────────────────────────────
# 2. Install / Reconcile Task Assistant
# ─────────────────────────────────────────────

echo "⚙️ Running prepare-repo (apply mode)..."

node scripts/prepare-repo.js "$REPO" --json | jq .

echo "✔ Repo preparation complete"
echo

# ─────────────────────────────────────────────
# 3. Create certification issue (NO --json)
# ─────────────────────────────────────────────

echo "📝 Creating certification issue..."

ISSUE_URL=$(
  gh issue create \
    --repo "$REPO" \
    --title "Phase 3.2 Certification Issue" \
    --body "Used exclusively for Phase 3.2 certification" \
    --label "phase-3.2" \
    --milestone "Phase 3.2 – Hygiene & Enforcement"
)

ISSUE_NUMBER=$(basename "$ISSUE_URL")

echo "✔ Issue #$ISSUE_NUMBER created"
echo

# ─────────────────────────────────────────────
# 4. Exercise Phase 3.2 enforcement paths
# ─────────────────────────────────────────────

echo "🔬 Exercising enforcement rules..."

# Multiple phase labels → exclusivity resolution
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
  --add-label "phase-3.3"

# Track conflict
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
  --add-label "track/sprint" \
  --add-label "track/backlog"

# Milestone conflict
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
  --milestone "Phase 3.1 – Telemetry Enhancements"

sleep 5

# Cleanup event
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
  --remove-label "track/backlog"

echo "✔ Enforcement exercised"
echo

# ─────────────────────────────────────────────
# 5. Validate telemetry evidence
# ─────────────────────────────────────────────

echo "📡 Validating telemetry output..."

TODAY=$(date -u +"%Y-%m-%d")
REPO_NAME=$(basename "$REPO")

rm -rf /tmp/ta-telemetry
gh repo clone "$TELEMETRY_REPO" /tmp/ta-telemetry -- --quiet

TELEMETRY_FILE="/tmp/ta-telemetry/telemetry/v1/repos/$REPO_NAME/$TODAY.jsonl"

if [[ ! -f "$TELEMETRY_FILE" ]]; then
  echo "❌ Missing repo telemetry file: $TELEMETRY_FILE"
  exit 1
fi

jq -e '
  select(.tool == "issue-events")
  | select(.checks != null)
  | select(.actions != null)
' "$TELEMETRY_FILE" >/dev/null

echo "✔ Telemetry evidence verified"
echo

# ─────────────────────────────────────────────
# 6. Final verdict
# ─────────────────────────────────────────────

echo "🏁 Phase 3.2 CERTIFICATION: PASSED"
