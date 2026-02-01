#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Task Assistant — Evidence Capture Helper
#
# Usage:
#   capture-test-evidence.sh <owner/repo> <test-id>
#
# Purpose:
#   Collects immutable evidence snapshots for Phase 3.4 tests
#   (especially tests 08–12).
#
# Guarantees:
#   • Read-only
#   • Infra v2 aware
#   • No repo mutation
#   • Safe in CI and locally
# ============================================================

REPO="${1:-}"
TEST_ID="${2:-}"

if [[ -z "$REPO" || -z "$TEST_ID" ]]; then
  echo "Usage: capture-test-evidence.sh <owner/repo> <test-id>"
  exit 1
fi

OWNER="${REPO%%/*}"
NAME="${REPO##*/}"

DATE="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
BASE_DIR="docs/validation/results/${TEST_ID}/${OWNER}-${NAME}/${DATE}"

mkdir -p "$BASE_DIR"

echo
echo "📦 Capturing evidence"
echo "• Repo:     $REPO"
echo "• Test ID:  $TEST_ID"
echo "• Output:   $BASE_DIR"
echo

# ------------------------------------------------------------
# Dependencies
# ------------------------------------------------------------
for cmd in gh jq node; do
  command -v "$cmd" >/dev/null || {
    echo "❌ Missing dependency: $cmd"
    exit 1
  }
done

# ------------------------------------------------------------
# 1) Infra resolution snapshot
# ------------------------------------------------------------
echo "→ Capturing infra resolution"

GITHUB_TOKEN="$(gh auth token)" \
  node scripts/infra/resolve-repo-context.js "$REPO" \
  > "$BASE_DIR/infra-resolution.json" || true

# ------------------------------------------------------------
# 2) Repo metadata snapshot
# ------------------------------------------------------------
echo "→ Capturing repo metadata"

gh repo view "$REPO" \
  --json name,owner,visibility,isArchived,defaultBranchRef \
  > "$BASE_DIR/repo-metadata.json" || true

# ------------------------------------------------------------
# 3) Labels snapshot
# ------------------------------------------------------------
echo "→ Capturing labels"

gh label list \
  --repo "$REPO" \
  --limit 500 \
  --json name,color,description \
  > "$BASE_DIR/labels.json" || true

# ------------------------------------------------------------
# 4) Milestones snapshot
# ------------------------------------------------------------
echo "→ Capturing milestones"

gh api "repos/$REPO/milestones?state=all&per_page=100" \
  --paginate \
  > "$BASE_DIR/milestones.json" || true

# ------------------------------------------------------------
# 5) Open issues snapshot
# ------------------------------------------------------------
echo "→ Capturing open issues"

gh issue list \
  --repo "$REPO" \
  --state open \
  --limit 200 \
  --json number,title,labels,milestone \
  > "$BASE_DIR/open-issues.json" || true

# ------------------------------------------------------------
# 6) Recent workflow runs (Task Assistant only)
# ------------------------------------------------------------
echo "→ Capturing recent workflow runs"

gh run list \
  --repo automated-assistant-systems/task-assistant \
  --limit 20 \
  --json name,status,conclusion,event,createdAt \
  > "$BASE_DIR/workflow-runs.json" || true

# ------------------------------------------------------------
# 7) Telemetry presence snapshot
# ------------------------------------------------------------
echo "→ Capturing telemetry tree (if accessible)"

TELEMETRY_REPO="$(
  GITHUB_TOKEN="$(gh auth token)" \
  node scripts/infra/resolve-telemetry-repo.js "$REPO" 2>/dev/null || true
)"

if [[ -n "$TELEMETRY_REPO" ]]; then
  echo "• Telemetry repo: $TELEMETRY_REPO"

  gh api "repos/$TELEMETRY_REPO/contents/telemetry" \
    > "$BASE_DIR/telemetry-tree.json" 2>/dev/null || true
else
  echo "• Telemetry repo unresolved"
fi

# ------------------------------------------------------------
# 8) Summary
# ------------------------------------------------------------
cat > "$BASE_DIR/README.md" <<EOF
# Evidence Snapshot

- Repo: $REPO
- Test ID: $TEST_ID
- Captured at: $DATE

## Files

- infra-resolution.json
- repo-metadata.json
- labels.json
- milestones.json
- open-issues.json
- workflow-runs.json
- telemetry-tree.json (if accessible)

This snapshot is **read-only** and reflects repo state at capture time.
EOF

echo
echo "✅ Evidence capture complete"
echo "📂 $BASE_DIR"
echo
