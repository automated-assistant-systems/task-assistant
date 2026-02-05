#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Phase 3.4 — Test 04 Evidence Capture Helper
#
# • Read-only
# • Operator-safe
# • No mutations
# • No workflow triggers
# ============================================================

REPO="${1:-}"
STEP_LABEL="${2:-}"

if [[ -z "$REPO" || -z "$STEP_LABEL" ]]; then
  echo "Usage: capture-test-04-evidence.sh <owner/repo> <step-label>"
  exit 1
fi

if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  echo "❌ Evidence capture is operator-only"
  exit 1
fi

OWNER="${REPO%%/*}"
NAME="${REPO##*/}"
DATE_UTC="$(date -u +%Y-%m-%dT%H-%M-%SZ)"

BASE_DIR="docs/validation/results/test-04-install-failures"
OUT_DIR="$BASE_DIR/${STEP_LABEL}_${DATE_UTC}"

mkdir -p "$OUT_DIR"

echo
echo "📸 Capturing Test 04 Evidence"
echo "Repo:  $REPO"
echo "Step:  $STEP_LABEL"
echo "Out:   $OUT_DIR"
echo

# ------------------------------------------------------------
# 1. Infra resolution
# ------------------------------------------------------------
echo "→ Capturing infra resolution"

GITHUB_TOKEN="$(gh auth token)" \
node -e '
import { resolveInfraForRepo } from "./lib/infra.js";
const repo = process.argv[1];
const token = process.env.GITHUB_TOKEN;
const r = await resolveInfraForRepo({ targetRepo: repo, githubToken: token });
console.log(JSON.stringify(r, null, 2));
' "$REPO" \
> "$OUT_DIR/infra-resolution.json" 2>&1 || true

# ------------------------------------------------------------
# 2. Telemetry directory state
# ------------------------------------------------------------
echo "→ Capturing telemetry directory state"

TELEMETRY_REPO="$(
  GITHUB_TOKEN="$(gh auth token)" \
  node scripts/infra/resolve-telemetry-repo.js "$REPO" 2>/dev/null || true
)"

if [[ -n "$TELEMETRY_REPO" ]]; then
  echo "Telemetry repo: $TELEMETRY_REPO" > "$OUT_DIR/telemetry-repo.txt"

  gh api "repos/$TELEMETRY_REPO/contents/telemetry/repos/$NAME" \
    --jq '.' \
    > "$OUT_DIR/telemetry-tree.json" 2>/dev/null \
    || echo "No telemetry directory present" > "$OUT_DIR/telemetry-tree.txt"
else
  echo "Telemetry repo unresolved" > "$OUT_DIR/telemetry-tree.txt"
fi

# ------------------------------------------------------------
# 3. Repo hygiene snapshot
# ------------------------------------------------------------
echo "→ Capturing repo hygiene"

gh label list --repo "$REPO" --limit 200 \
  --json name,color,description \
  > "$OUT_DIR/labels.json" 2>/dev/null || true

gh api "repos/$REPO/milestones?state=all&per_page=100" \
  > "$OUT_DIR/milestones.json" 2>/dev/null || true

# ------------------------------------------------------------
# 4. Recent workflow runs
# ------------------------------------------------------------
echo "→ Capturing recent workflow runs"

gh run list \
  --repo "$REPO" \
  --limit 10 \
  --json name,status,conclusion,event,createdAt \
  > "$OUT_DIR/recent-workflows.json" 2>/dev/null || true

# ------------------------------------------------------------
# 5. Summary marker
# ------------------------------------------------------------
cat > "$OUT_DIR/README.txt" <<EOF
Test 04 Evidence Snapshot

Repo:        $REPO
Step:        $STEP_LABEL
Captured at: $DATE_UTC

This snapshot is read-only evidence of system state.
No workflows were triggered.
No mutations were performed.
EOF

echo
echo "✅ Evidence captured"
echo "📂 $OUT_DIR"
echo
