#!/usr/bin/env bash
set -euo pipefail

ROOT="docs/validation/results/test-04-install-failures"

fail() { echo "❌ $1"; exit 1; }
pass() { echo "✅ $1"; }
warn() { echo "⚠️  $1"; }

echo
echo "🔍 Verifying Test 04 — Install & Setup Failure Modes"
echo "Root: $ROOT"
echo

[[ -d "$ROOT" ]] || fail "Missing test-04-install-failures directory"

assert_no_task_assistant_labels() {
  local file="$1"

  [[ -f "$file" ]] || fail "Missing labels.json"

  if jq -e '
    map(.name)
    | map(
        test("^phase-")
        or test("^track/")
        or test("^codex:")
        or IN("SUCCESS","FAILED","BLOCKED","PARTIAL")
      )
    | any
  ' "$file" >/dev/null; then
    fail "Task Assistant labels present"
  else
    pass "No Task Assistant labels present (GitHub defaults allowed)"
  fi
}

assert_empty_array() {
  local file="$1"
  local label="$2"

  [[ -f "$file" ]] || fail "Missing $label: $file"
  jq -e 'length == 0' "$file" >/dev/null \
    && pass "$label empty" \
    || fail "$label not empty"
}

assert_no_telemetry_emitted() {
  local tree_json="$1"

  [[ -f "$tree_json" ]] || pass "No telemetry tree (ok)"

  if jq -e '
    .. | objects
    | .path? // empty
    | test("\\.jsonl$")
      or test("diagnostics\\.json$")
  ' "$tree_json" >/dev/null; then
    fail "Telemetry files detected"
  else
    pass "No telemetry emitted"
  fi
}

assert_failed_workflow() {
  jq -e 'length > 0 and any(.[]; .conclusion != "success")' "$1" >/dev/null \
    && pass "Workflow failed as expected" \
    || fail "Workflow did not fail as expected"
}

assert_no_workflow() {
  jq -e 'length == 0' "$1" >/dev/null \
    && pass "No workflow triggered (expected)" \
    || fail "Unexpected workflow execution"
}

for step in "$ROOT"/step-*; do
  STEP="$(basename "$step")"
  echo
  echo "▶ Verifying $STEP"

  LABELS="$step/labels.json"
  MILESTONES="$step/milestones.json"
  WORKFLOWS="$step/recent-workflows.json"
  TELEMETRY="$step/telemetry-tree.json"
  INFRA="$step/infra-resolution.json"

  assert_no_task_assistant_labels "$LABELS"
  assert_empty_array "$MILESTONES" "milestones"
  assert_no_telemetry_emitted "$step/telemetry-tree.json"

  jq -e '.versionUsed != null' "$INFRA" >/dev/null \
    && pass "Infra resolution present" \
    || fail "Infra resolution missing"

  case "$STEP" in
    step-a-install-only*)
      assert_no_workflow "$WORKFLOWS"
      ;;
    step-b-*|step-d-*|step-f-*)
      assert_failed_workflow "$WORKFLOWS"
      ;;
    *)
      warn "No explicit workflow expectation for $STEP"
      ;;
  esac
done

echo
echo "🎉 Test 04 verification PASSED"
