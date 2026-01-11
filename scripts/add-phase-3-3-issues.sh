#!/usr/bin/env bash
set -euo pipefail

REPO="automated-assistant-systems/task-assistant"
MILESTONE="Phase 3.3 – UX & Config Experience"

PHASE_LABELS=("phase-3" "phase-3.3")

declare -A ISSUES=(
  ["Improve workflow failure annotations"]="Clarify GitHub Actions failure annotations so operators can immediately understand why a workflow failed and what subsystem caused it.\n\nScope:\n- issue-events\n- self-test\n- nightly sweep\n\nNo enforcement changes."
  ["Add operator remediation guidance to logs"]="Ensure all validation and failure paths emit deterministic, actionable remediation guidance.\n\nOperators should not need to read source code."
  ["Fail fast on invalid configuration"]="Harden validation so invalid or ambiguous configuration causes early, hard failure with no partial execution.\n\nIdempotency must be preserved."
  ["Improve prepare-repo UX diagnostics"]="Improve error and warning messaging in prepare-repo to clearly explain missing prerequisites, invalid state, or unsafe configuration.\n\nNo behavior changes."
  ["Create canonical configuration reference"]="Add a minimal, authoritative configuration reference for .github/task-assistant.yml.\n\nNo tutorials, no marketing."
  ["Conduct operator UX audit pass"]="Review Phase 3.3 workflows end-to-end from an operator perspective and document confusion points or ambiguity.\n\nOutput is findings + fixes only."
)

echo "Fetching existing Phase 3.3 issues…"
EXISTING_TITLES=$(gh issue list --repo "$REPO" --milestone "$MILESTONE" --json title -q '.[].title')

for TITLE in "${!ISSUES[@]}"; do
  if echo "$EXISTING_TITLES" | grep -Fxq "$TITLE"; then
    echo "✔ Skipping existing issue: $TITLE"
  else
    echo "➕ Creating issue: $TITLE"
    gh issue create \
      --repo "$REPO" \
      --title "$TITLE" \
      --body "${ISSUES[$TITLE]}" \
      --milestone "$MILESTONE" \
      $(printf -- '--label %s ' "${PHASE_LABELS[@]}") \
      --label "priority/medium" \
      --label "track/ops"
  fi
done

echo "Phase 3.3 issue sync complete."
