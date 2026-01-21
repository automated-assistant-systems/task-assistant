#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Workflow Validation — Dispatch / Engine / Telemetry
# ============================================================

REPO="${1:-}"
OWNER="$(cut -d/ -f1 <<< "$REPO")"

# ------------------------------------------------------------
# Resolve telemetry repository (org-scoped, configurable)
# ------------------------------------------------------------
echo
echo "🔐 Resolving telemetry repo from infra registry..."

INFRA_REPO="automated-assistant-systems/task-assistant-infra"
INFRA_PATH="telemetry-registry.json"

REGISTRY_JSON="$(
  gh api "repos/$INFRA_REPO/contents/$INFRA_PATH" \
    --jq '.content' \
  | base64 --decode
)"

TELEMETRY_REPO="$(
  echo "$REGISTRY_JSON" \
  | jq -r \
      --arg owner "$OWNER" \
      --arg repo "$REPO_NAME" '
        .organizations[]
        | select(.owner == $owner)
        | select(
            .repositories[]
            | select(.name == $repo and .enabled == true)
          )
        | .telemetry_repo
      ' \
  | head -n1
)"

if [[ -z "$TELEMETRY_REPO" || "$TELEMETRY_REPO" == "null" ]]; then
  echo "❌ Repo is not registered in infra telemetry registry"
  echo "   Owner: $OWNER"
  echo "   Repo:  $REPO_NAME"
  exit 1
fi

export TELEMETRY_REPO

echo "✓ TELEMETRY_REPO resolved: $TELEMETRY_REPO"

echo
echo "🔬 Workflow Validation"
echo "Repo under test:     $REPO"
echo "Telemetry repo:      $TELEMETRY_REPO"
echo "UTC date:            $TODAY_UTC"
echo

# ------------------------------------------------------------
# Helper: wait for latest dispatch run
# ------------------------------------------------------------
wait_for_dispatch() {
  local mode="$1"

  echo "→ Triggering dispatch ($mode)..."

  gh workflow run task-assistant-dispatch.yml \
    --repo "$REPO" \
    -f mode="$mode" >/dev/null

  sleep 3

  RUN_ID="$(gh run list \
    --repo "$REPO" \
    --workflow task-assistant-dispatch.yml \
    --limit 1 \
    --json databaseId \
    | jq -r '.[0].databaseId')"

  if [[ -z "$RUN_ID" || "$RUN_ID" == "null" ]]; then
    echo "❌ No dispatch run found"
    exit 1
  fi

  gh run watch --repo "$REPO" "$RUN_ID" --exit-status
  echo "✓ Dispatch ($mode) completed"
}

# ------------------------------------------------------------
# 1) Self-test (via dispatch)
# ------------------------------------------------------------
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣ Dispatch self-test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

wait_for_dispatch "self-test"

# ------------------------------------------------------------
# 2) Validate config (via dispatch)
# ------------------------------------------------------------
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣ Dispatch validate"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

wait_for_dispatch "validate"

# ------------------------------------------------------------
# 3) Create issue and introduce violations
# ------------------------------------------------------------
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣ Create issue + violations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ISSUE_URL="$(
  gh issue create \
    --repo "$REPO" \
    --title "Phase 3.3 Enforcement Test" \
    --body "Automated enforcement validation." \
    --label "track/backlog"
)"

ISSUE_NUMBER="$(echo "$ISSUE_URL" | sed -n 's#.*/issues/\([0-9]\+\).*#\1#p')"

echo "✓ Created issue #$ISSUE_NUMBER"

# Introduce deterministic violations
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label "track/sprint" >/dev/null
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label "phase-3.5"   >/dev/null

echo "✓ Violations introduced"

# ------------------------------------------------------------
# 4) Expect enforcement failure
# ------------------------------------------------------------
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣ Expect enforcement failure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

sleep 3

wait_for_dispatch "enforce"

# ------------------------------------------------------------
# 5) Repair issue + re-trigger
# ------------------------------------------------------------
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣ Repair issue + re-trigger"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
  --remove-label "track/backlog" >/dev/null

# Touch issue to retrigger enforcement
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label "telemetry"  >/dev/null
sleep 2
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --remove-label "telemetry" >/dev/null

echo "✓ Issue repaired and retriggered"

sleep 3

wait_for_dispatch "enforce"

# ------------------------------------------------------------
# 6) Validate telemetry evidence
# ------------------------------------------------------------
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣ Validate telemetry"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

gh repo clone "$TELEMETRY_REPO" "$TELE_DIR" -- --quiet

REPO_FILE="$TELE_DIR/telemetry/v1/repos/$REPO_NAME/$TODAY_UTC.jsonl"

if [[ ! -f "$REPO_FILE" ]]; then
  echo "❌ Missing telemetry file: $REPO_FILE"
  exit 1
fi

echo "✓ Telemetry file found"

# Must contain failure
grep -q '"category":"enforce".*"action":"failed"' "$REPO_FILE" || {
  echo "❌ Missing enforcement failure telemetry"
  exit 1
}

echo "✓ Enforcement failure recorded"

# Must contain success
grep -q '"category":"enforce".*"action":"success"' "$REPO_FILE" || {
  echo "❌ Missing enforcement success telemetry"
  exit 1
}

echo "✓ Enforcement success recorded"

# Must include self-test + validate
for cat in self-test validate enforce; do
  grep -q "\"category\":\"$cat\"" "$REPO_FILE" || {
    echo "❌ Missing telemetry category: $cat"
    exit 1
  }
done

echo "✓ All expected telemetry categories present"

# ------------------------------------------------------------
# Done
# ------------------------------------------------------------
echo
echo "🏁 Phase 3.3 VALIDATION: PASSED"
echo "Telemetry proof:"
echo "  $REPO_FILE"

