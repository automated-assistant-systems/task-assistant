#!/usr/bin/env bash
set -euo pipefail
: "${GH_TOKEN:?GH_TOKEN must be set (use: export GH_TOKEN=\$(gh auth token))}"

echo "🧪 Telemetry 409 regression test"

# ─────────────────────────────────────────────
# Test config (SAFE test repo)
# ─────────────────────────────────────────────
OWNER="automated-assistant-systems"
REPO="task-assistant"
TELEMETRY_REPO="automated-assistant-systems/task-assistant-telemetry"

ENGINE_NAME="test409"
ENGINE_JOB="test409"
CORRELATION_ID="409-test-$(date +%s)"

export OWNER REPO TELEMETRY_REPO ENGINE_NAME ENGINE_JOB CORRELATION_ID
export GH_TOKEN="${GH_TOKEN:?GH_TOKEN must be set}"

TMP_DIR="$(mktemp -d)"
cd "$TMP_DIR"

# ─────────────────────────────────────────────
# Step 1: Create a result payload
# ─────────────────────────────────────────────
cat > result.json <<'JSON'
{
  "ok": true,
  "summary": "409 regression test"
}
JSON

export RESULT_FILE="result.json"

DATE="$(date +%Y-%m-%d)"
BASE_DIR="telemetry/v1/repos/${REPO}/${DATE}/${CORRELATION_ID}"
API_BASE="repos/${TELEMETRY_REPO}/contents"

# ─────────────────────────────────────────────
# Step 2: Create directory
# ─────────────────────────────────────────────
gh api \
  --method PUT \
  "${API_BASE}/${BASE_DIR}/.keep" \
  --field message="test: create dir" \
  --field content="$(printf '' | base64)" \
  >/dev/null

# ─────────────────────────────────────────────
# Step 3: Mutate directory out-of-band
# This invalidates the tree SHA
# ─────────────────────────────────────────────
gh api \
  --method PUT \
  "${API_BASE}/${BASE_DIR}/mutation.txt" \
  --field message="test: force tree mutation" \
  --field content="$(printf 'mutation' | base64)" \
  >/dev/null

# ─────────────────────────────────────────────
# Step 4: Emit telemetry (this MUST hit a 409 first)
# ─────────────────────────────────────────────
echo "→ Running emit-engine (should retry internally)"
"$OLDPWD/scripts/telemetry/emit-engine.sh"

# ─────────────────────────────────────────────
# Step 5: Verify exactly one engine record exists
# ─────────────────────────────────────────────
FILES="$(
  gh api "${API_BASE}/${BASE_DIR}" --jq '.[].name'
)"

COUNT="$(echo "$FILES" | grep -c '^test409.json$' || true)"

if [[ "$COUNT" -ne 1 ]]; then
  echo "::error::Expected exactly 1 telemetry file, found $COUNT"
  exit 1
fi

echo "✅ 409 retry regression test passed"
