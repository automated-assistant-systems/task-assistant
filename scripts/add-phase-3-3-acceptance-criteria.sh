#!/usr/bin/env bash
set -euo pipefail

REPO="automated-assistant-systems/task-assistant"

append_if_missing() {
  local ISSUE="$1"
  local MARKER="$2"
  local CONTENT="$3"

  BODY=$(gh issue view "$ISSUE" --repo "$REPO" --json body -q '.body')

  if echo "$BODY" | grep -Fq "$MARKER"; then
    echo "✔ Issue #$ISSUE already has acceptance criteria"
  else
    echo "➕ Appending acceptance criteria to issue #$ISSUE"
    gh issue edit "$ISSUE" --repo "$REPO" --body "$BODY

$CONTENT"
  fi
}

# ---------- Issue #13 ----------
append_if_missing 13 "### Acceptance Criteria" "
### Acceptance Criteria

- [ ] Invalid configuration fails **before** enforcement runs
- [ ] Error identifies the exact config key or path
- [ ] Error explains why the value is invalid
- [ ] Error provides exactly one concrete remediation
- [ ] Output is visible in GitHub Actions logs
- [ ] Same invalid input produces the same error
- [ ] No silent defaults or inferred behavior
- [ ] Enforcement behavior is unchanged

**Definition of Done:**  
A misconfigured repo fails immediately with a clear, teachable error.
"

# ---------- Issue #14 ----------
append_if_missing 14 "### Acceptance Criteria" "
### Acceptance Criteria

- [ ] Document is minimal and authoritative
- [ ] Covers prepare-repo usage and prerequisites
- [ ] Lists required files, labels, and milestones
- [ ] Describes first successful run expectations
- [ ] Explicitly states what Phase 3.3 does NOT configure
- [ ] No marketing language or screenshots
- [ ] Matches actual system behavior

**Definition of Done:**  
A repo can be onboarded without guesswork.
"

# ---------- Issue #9 ----------
append_if_missing 9 "### Acceptance Criteria" "
### Acceptance Criteria

- [ ] Issue scope rewritten to remove ambiguity
- [ ] Limited to repo-scoped, read-only telemetry
- [ ] No telemetry schema changes
- [ ] No new telemetry writes
- [ ] Summary answers: What ran, what failed, why

**Definition of Done:**  
Operators can assess repo health without inspecting raw telemetry.
"

# ---------- Remaining Phase 3.3 Issues by Title ----------
declare -A TITLE_CRITERIA=(
["Improve workflow failure annotations"]="
### Acceptance Criteria

- [ ] Failure annotation names the subsystem
- [ ] Failure reason is visible in Actions UI summary
- [ ] Same failure produces same annotation
- [ ] No enforcement logic changes

**Definition of Done:**  
Operators understand failure cause without opening logs.
"
["Add operator remediation guidance to logs"]="
### Acceptance Criteria

- [ ] Logs state what failed and why
- [ ] Logs provide exactly one remediation step
- [ ] Guidance is deterministic and stable
- [ ] Guidance matches documentation

**Definition of Done:**  
Logs immediately answer 'what do I do next?'.
"
["Fail fast on invalid configuration"]="
### Acceptance Criteria

- [ ] Validation runs before any side effects
- [ ] Invalid config causes hard failure
- [ ] No partial execution occurs
- [ ] Idempotency preserved
- [ ] Valid behavior unchanged

**Definition of Done:**  
Invalid config never causes ambiguous behavior.
"
["Improve prepare-repo UX diagnostics"]="
### Acceptance Criteria

- [ ] Missing prerequisites clearly identified
- [ ] Errors distinguish missing vs invalid vs unsafe
- [ ] Dry-run output matches real execution
- [ ] No automatic fixes without confirmation

**Definition of Done:**  
Operators understand repo state before changes.
"
["Create canonical configuration reference"]="
### Acceptance Criteria

- [ ] Every supported config key documented
- [ ] Defaults explicitly stated
- [ ] Invalid values described where possible
- [ ] Single authoritative document
- [ ] No tutorials or marketing content

**Definition of Done:**  
Config validity can be determined by inspection.
"
["Conduct operator UX audit pass"]="
### Acceptance Criteria

- [ ] Walkthrough of fresh, broken, and healthy repo
- [ ] Confusion points documented
- [ ] Root causes identified
- [ ] Fixes limited to Phase 3.3 scope

**Definition of Done:**  
Known operator confusion is eliminated or documented.
"
)

for TITLE in "${!TITLE_CRITERIA[@]}"; do
  ISSUE_NUMBER=$(gh issue list --repo "$REPO" --search "$TITLE" --json number,title -q '.[] | select(.title=="'"$TITLE"'") | .number')
  if [[ -n "$ISSUE_NUMBER" ]]; then
    append_if_missing "$ISSUE_NUMBER" "### Acceptance Criteria" "${TITLE_CRITERIA[$TITLE]}"
  else
    echo "⚠️ Issue not found: $TITLE (skipping)"
  fi
done

echo "Phase 3.3 acceptance criteria injection complete."
