# Phase 3.4 Validation Plan
## Objective
The Phase 3.4 Validation Plan is designed to validate all code paths and edge cases.
Consequently, the tests will not only validate successful outcomes, but also verify correct responses to incorrect actions and missing conditions.
The following is a list of specific activities covered by the tests:
- validate full Task Assistant execution lifecycle
- validate full Task Assistant execution lifecycle in host repo
- validate multiple orgs running concurrently
- validate multiple repos running concurrently
- validate multiple orgs & multiple repos running concurrently
- validate full install process
- test missing app
- test missing secrets
- test missing registration
- test missing app on telemetry
- test missing labels and milestones
- test v2 disabled repo
- collect telemetry validation evidence

Concurrent validation means independent execution contexts with overlapping
time windows; no shared state, locking, or serialization is assumed.

## Repos to Test Against
- automated-assistant-systems/task-assistant-sandbox
- garybayes/ta-marketplace-install-test
- garybayes/ta-sandbox (to be created)

## Standard Test Scripts
### Reset Sandbox
Resets a sandbox repo to a known baseline:
  • Closes open issues (history preserved)
  • Deletes phase-* and track/* labels
  • Deletes all milestones
Optional:
  • --reset-telemetry → deletes repo-scoped telemetry directory
scripts/sandbox/reset-sandbox.sh <owner/repo> --reset-telemetry

### Install Task Assistant
Installs ONLY:
  • .github/task-assistant.yml
  • .github/workflows/task-assistant-dispatch.yml
scripts/sandbox/install-task-assistant.sh <owner/repo>

### Prepare repo (required)
Task Assistant — Repository Preparation Script will:
 - Core config errors: FAIL
 - Enforcement config errors: WARN
 - Repo hygiene remains authoritative
 - No telemetry emitted here
GH_TOKEN=ghp_xxx \
  node scripts/prepare-repo.js \
  <owner/repo>

### Verify repository integrity after mutation
This script is an operator convenience wrapper.
It triggers authoritative engines via dispatch:
  1. self-test
  2. validate
Engines generate correlation IDs internally.
This script never invokes engines directly.
scripts/onboarding/verify-repo.sh <owner>/<repo>

### Run Self-Test
Triggers the Task-Assistant Self-Test engine via dispatch.
This verifies end-to-end functionality of the repo.
TARGET_REPO=<owner/repo> scripts/dispatch/run-self-test.sh

### Run Validate
Triggers the Task-Assistant Validate engine via dispatch.
This validates repo hygiene (labels, milestones, enforcement invariants).
TARGET_REPO=<owner/repo> scripts/dispatch/run-validate.sh

### Validate Enforcement
Prove that invalid issue state is automatically corrected via event-driven enforcement.
Notes:
  • No correlation IDs are generated or passed
  • Telemetry is verified separately via evidence collection
scripts/validate/validate-enforcement.sh <owner/repo>

### Collect validation evidence
Collect telemetry evidence for permanent verification of successful completion of tests
scripts/telemetry/collect-test-evidence.sh \
  <owner/repo> \
  "$(date -u +%Y-%m-%d)" \
  <test-id>

Validation evidence is captured per-repo under docs/validation/results/

### Test Wrapper
This script calls all of the above scripts as a one-step process for testing a repo.
scripts/validation/run-validation-test.sh \
  <test-id> \
  <owner/repo>

### Operator Repo Prep
This script prepares multiple repos in preparation for concurrent enforcement validation
  • Operator-only (never CI)
  • Performs all mutation BEFORE concurrency
  • Resets ONLY repos used by the selected test (reset-sandbox.sh)
  • Install app + config (install-task-assistant.sh)
  • Install labels + milestones (prepare-repo.sh)
  • Verifies install + config (self-test + validate) (verify-repo.sh)
scripts/validation/prepare-matrix-repos.sh <test-id>

### Enforcement-Only Validation
This script is run concurrently in separate command-lines, one per repo
  • Safe in CI and locally
  • No resets
  • No installs
  • No repo preparation
  • Tolerates partial access
  • performs repo enforcement (validate-enforcement.sh)
  • validate repo hygiene (run-validate.sh)
  • collect evidence (collect-test-evidence.sh)
scripts/validation/run-enforcement-only.sh <test-id> <owner/repo>

### Prune telemetry
Prune all but one correlation id repo telemetry to verify correct processing of partial data.
TELEMETRY_REPO=owner/task-assistant-telemetry \
  scripts/telemetry/prune-telemetry.sh repo

### Test 4 Evidence Capture Helper
  • Read-only
  • Operator-safe
  • No mutations
  • No workflow triggers
  scripts/validation/capture-test-04-evidence.sh <owner/repo> <step-label>

### Evidence Capture Helper
  • Read-only
  • Operator-safe
  • No mutations
  • No workflow triggers
  scripts/validation/capture-test-evidence.sh <owner/repo> <test-id>

## Tests
### 1. Validate full functionality of Task Assistant in org sandbox repo
  scripts/validation/run-validation-test.sh \
    test-01-basic \
    automated-assistant-systems/task-assistant-sandbox
This will perform the following:
    a) Reset the repo
	Expected:
	- all issues closed
	- all milestones deleted
	- all Task Assistant labels removed
	- all repo telemetry files removed

    b) Install Task Assistant (dispatch + config only)
	Expected:
	- .github/task-assistant.yml - config file installed into repo
	- .github/workflows/task-assistant-dispatch.yml - installed into repo

    c) Prepare repo (labels + milestones)
	Expected:
	- Labels created
	- Milestones created
	- Exit code 0

    d) Validate end-to-end and repo hygiene
	Expected:
	- Infra resolves via v2
	- Labels & milestones verified
	- Dispatch workflow verified
	- App access to telemetry verified
	- Validation telemetry emitted
	- Exit code 0

    e) Validate Enforcement
	Expected:
	- Verify that invalid issues were corrected to enforce repo hygiene
	- No errors
	- No duplicate state
	- Validation telemetry emitted
	- Exit code 0

    f) Validate repo hygiene
	Expected:
	- engine-validate confirms no hygiene regression after enforcement
	- No mutation of labels or milestones
	- Validation telemetry emitted

    g) Collect validation evidence
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output
	- docs/validation/results/test-01-basic/automated-assistant-systems-task-assistant-sandbox.json

### 2. Validate full functionality of Task Assistant in host org sandbox repo
  scripts/validation/run-validation-test.sh \
    test-02-hosted \
    garybayes/ta-marketplace-install-test
	Expected:
	- Identical outcome to Test 1
	- docs/validation/results/test-02-hosted/garybayes-ta-marketplace-install-test.json

### 3. Validate full functionality of Task Assistant in multiple orgs running concurrently
   a) Prepare Repos
	scripts/validation/prepare-matrix-repos.sh \
	  test-03-multi-org
	Expected:
	- Identical outcome to Test 1 a) - d) for repos under test
	- automated-assistant-systems/task-assistant-sandbox
	- garybayes/ta-marketplace-install-test

    b) Validate concurrent enforcement 
	scripts/validation/run-enforcement-only.sh \
	  test-03-multi-org \
	  automated-assistant-systems/task-assistant-sandbox
	scripts/validation/run-enforcement-only.sh \
	  test-03-multi-org \
	  garybayes/ta-marketplace-install-test
	Expected:
	- Identical outcome to Test 1 e) - g) for repos under test
	- automated-assistant-systems/task-assistant-sandbox
	- garybayes/ta-marketplace-install-test
	- JSON output file for each repo
	- docs/validation/results/test-03-multi-org/*

### 4. Test install process and missing setup failures
    a) Create garybayes/ta-sandbox using default settings:
	- Repository Visibility: Public
	- README: Off
	- .gitignore: None
	- License: None
       Collect evidence
	  scripts/validation/capture-test-04-evidence.sh \
	    garybayes/ta-sandbox step-a-pre-install-zero-state
       Install Task Assistant (dispatch + config only)
	  scripts/sandbox/install-task-assistant.sh \
	    garybayes/ta-sandbox
       Collect evidence
	  scripts/validation/capture-test-04-evidence.sh \
	    garybayes/ta-sandbox step-a-install-only

    b) Trigger self-test on garybayes/ta-sandbox (not registered)
	TARGET_REPO=garybayes/ta-sandbox \
	  scripts/dispatch/run-self-test.sh
       Collect evidence
	scripts/validation/capture-test-04-evidence.sh \
	  garybayes/ta-sandbox step-b-self-test-unregistered
	Expected:
	- Preflight should fail
	- Confirm no new JSONL files created

    c) Register garybayes/ta-sandbox
	cd ~/projects/task-assistant-infra
	1. Create a branch to ensure mutations never happen on main
	    scripts/infra/helpers/new-branch.sh \
		infra/register-garybayes-ta-sandbox

	2. Register repo, stage registry and changelog and verify
	    scripts/infra/helpers/apply-infra-change.sh register \
	      --owner garybayes \
	      --repo ta-sandbox \
	      --context sandbox \
	      --telemetry task-assistant-telemetry \
	      --reason "Phase 3.4 validation sandbox onboarding"

	3. Commit and push the registry and changelog mutation
	    scripts/infra/helpers/commit-and-push-infra.sh \
	      "infra: register garybayes/ta-sandbox for Phase 3.4"

	4. Creates PR only from clean feature branch
	    scripts/infra/helpers/create-pr.sh

	5. Merges safely and deletes branch
	    scripts/infra/helpers/merge-pr.sh

	6. Collect test evidence
	    scripts/validation/capture-test-04-evidence.sh \
	      garybayes/ta-sandbox step-c-infra-registered

    d) Trigger self-test build (app not installed)
	TARGET_REPO=garybayes/ta-sandbox \
	  scripts/dispatch/run-self-test.sh
      Collect evidence
	scripts/validation/capture-test-04-evidence.sh \
	  garybayes/ta-sandbox step-d-self-test-no-app
	Expected:
	- Self-test should fail on garybayes/ta-sandbox
	- Confirm no new JSONL files created

    e) Install app on garybayes/ta-sandbox

    f) Trigger self-test on garybayes/ta-sandbox (no secrets)
	TARGET_REPO=garybayes/ta-sandbox \
	  scripts/dispatch/run-self-test.sh
      Collect evidence
	scripts/validation/capture-test-04-evidence.sh \
	  garybayes/ta-sandbox step-f-app-no-secrets
      Expected:
	- Preflight should fail
	- Confirm no new JSONL files created

    g) Add secrets
	Use GitHub UI to add CODEX_APP_ID and CODEX_PRIVATE_KEY

    h) Trigger self-test on garybayes/ta-sandbox (no labels or milestones)
	TARGET_REPO=garybayes/ta-sandbox \
	  scripts/dispatch/run-self-test.sh
      Collect evidence
	scripts/validation/capture-test-04-evidence.sh \
	  garybayes/ta-sandbox step-g-secrets-added
      Expected:
	- Preflight should fail
	- Confirm no new JSONL files created

    i) Prepare repo (labels + milestones)
	GH_TOKEN=ghp_xxx \
	  node scripts/prepare-repo.js \
	  garybayes/ta-sandbox
	Expected:
	- Labels created
	- Milestones created
	- Exit code 0

    j) Validate end-to-end and repo hygiene
	scripts/onboarding/verify-repo.sh garybayes/ta-sandbox
	Note: verify-repo.sh dynamically validates that all labels and milestones declared in .github/task-assistant.yml exist in the repository.
	If verification fails due to propagation delay after preparation, rerun verify-repo.sh until it succeeds, then collect evidence.
       Collect evidence
	scripts/validation/capture-test-04-evidence.sh \
	  garybayes/ta-sandbox step-j-verify-repo-success
	Expected:
	- Infra resolves
	- Labels & milestones verified
	- Dispatch workflow verified
	- App access to telemetry verified
	- Validation telemetry emitted
	- Exit code 0
	- docs/validation/results/test-04-install-failures/*

### 5. Validate Enforcement on newly created repo
	scripts/validation/run-enforcement-only.sh \
	  test-05-new-repo \
	  garybayes/ta-sandbox
	Expected:
	- Identical outcome to Test 1 e) - g) for repo
	- Single JSON output file
	- docs/validation/results/test-05-new-repo/garybayes-ta-sandbox

### 6. Validate full functionality of Task Assistant in multiple repos running concurrently
   a) Prepare Repos
	scripts/validation/prepare-matrix-repos.sh \
	  test-06-multi-repo
	Expected:
	- Identical outcome to Test 1 a) - d) for repos under test
	- garybayes/ta-marketplace-install-test
	- garybayes/ta-sandbox

    b) Validate concurrent enforcement 
	scripts/validation/run-enforcement-only.sh \
	  test-06-multi-repo \
	  garybayes/ta-marketplace-install-test
	scripts/validation/run-enforcement-only.sh \
	  test-06-multi-repo \
	  garybayes/ta-sandbox
	Expected:
	- Identical outcome to Test 1 e) - g) for repos under test
	- garybayes/ta-marketplace-install-test
	- garybayes/ta-sandbox
	- JSON output file for each repo
	- docs/validation/results/test-06-multi-repo/*

### 7. Validate full functionality of Task Assistant in multiple orgs + repos running concurrently
   a) Prepare Repos
	scripts/validation/prepare-matrix-repos.sh \
	  test-07-multi-org+repo
	Expected:
	- Identical outcome to Test 1 a) - d) for repos under test
	- automated-assistant-systems/task-assistant-sandbox
	- garybayes/ta-marketplace-install-test
	- garybayes/ta-sandbox

    b) Validate concurrent enforcement 
	scripts/validation/run-enforcement-only.sh \
	  test-07-multi-org+repo \
	  automated-assistant-systems/task-assistant-sandbox
	scripts/validation/run-enforcement-only.sh \
	  test-07-multi-org+repo \
	  garybayes/ta-marketplace-install-test
	scripts/validation/run-enforcement-only.sh \
	  test-07-multi-org+repo \
	  garybayes/ta-sandbox
	Expected:
	- Identical outcome to Test 1 e) - g) for repos under test
	- automated-assistant-systems/task-assistant-sandbox
	- garybayes/ta-marketplace-install-test
	- garybayes/ta-sandbox
	- JSON output file for each repo
	- docs/validation/results/test-07-multi-org+repo/*

### 8. Test app not installed on telemetry repo
   a) Remove app from garybayes/task-assistant-telemetry

   b) Trigger self-test garybayes/ta-sandbox
	TARGET_REPO=garybayes/ta-sandbox \
	  scripts/dispatch/run-self-test.sh

   c) Collect validation evidence
	scripts/validation/capture-test-evidence.sh \
	  garybayes/ta-sandbox \
	  test-08-app-not-installed
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output
	- docs/validation/results/test-08-telemetry-missing-app/garybayes-ta-sandbox.json

### 9. Validate repo disabled
   a) Disable garybayes/ta-sandbox
	cd ~/projects/task-assistant-infra
	1. Create a branch to ensure mutations never happen on main
	    scripts/infra/helpers/new-branch.sh \
		infra/disable-garybayes-ta-sandbox

	2. Register repo, stage registry and changelog and verify
	    scripts/infra/helpers/apply-infra-change.sh disable \
	      --owner garybayes \
	      --repo ta-sandbox \
	      --reason "Phase 3.4 validation sandbox disabled"

	3. Commit and push the registry and changelog mutation
	    scripts/infra/helpers/commit-and-push-infra.sh \
	      "infra: disable garybayes/ta-sandbox for Phase 3.4"

	4. Creates PR only from clean feature branch
	    scripts/infra/helpers/create-pr.sh

	5. Merges safely and deletes branch
	    scripts/infra/helpers/merge-pr.sh

   b) Trigger self-test on garybayes/ta-sandbox
	TARGET_REPO="garybayes/ta-sandbox" \
	  scripts/dispatch/run-self-test.sh
	Expected:
	- Preflight should fail
	- Confirm no new JSONL files created

    c) Collect validation evidence
	scripts/validation/capture-test-evidence.sh \
	  garybayes/ta-sandbox \
	  test-09-repo-disabled
	Expected:
	- Preflight should fail
	- Confirm no new JSONL files created
	- docs/validation/results/test-09-repo-disabled/garybayes-ta-sandbox.json

### 10. Test re-registering repo
	cd ~/projects/task-assistant-infra
	1. Create a branch to ensure mutations never happen on main
	    scripts/infra/helpers/new-branch.sh \
		infra/register-garybayes-ta-sandbox

	2. Register repo, stage registry and changelog and verify
	    scripts/infra/helpers/apply-infra-change.sh register \
	      --owner garybayes \
	      --repo ta-sandbox \
	      --context sandbox \
	      --telemetry task-assistant-telemetry \
	      --reason "Phase 3.4 validation sandbox re-registered"

	3. Commit and push the registry and changelog mutation
	    scripts/infra/helpers/commit-and-push-infra.sh \
	      "infra: re-register garybayes/ta-sandbox for Phase 3.4"

	4. Creates PR only from clean feature branch
	    scripts/infra/helpers/create-pr.sh

	5. Merges safely and deletes branch
	    scripts/infra/helpers/merge-pr.sh

   b) Trigger self-test on garybayes/ta-sandbox
	TARGET_REPO="garybayes/ta-sandbox" \
	  scripts/dispatch/run-self-test.sh
	Expected:
	- Preflight should fail
	- Confirm no new JSONL files created

    c) Collect validation evidence
	scripts/validation/capture-test-evidence.sh \
	  garybayes/ta-sandbox \
	  test-10-repo-re-registered
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output
	- docs/validation/results/test-10-repo-re-registered/garybayes-ta-sandbox.json

### 11. Partial telemetry recovery
    a) Delete all but one JSONL file in telemetry repo
	TELEMETRY_REPO=garybayes/task-assistant-telemetry \
	  scripts/telemetry/prune-telemetry.sh ta-sandbox

    b) Trigger dashboard build
	gh workflow run engine-dashboard.yml \
	  --repo automated-assistant-systems/task-assistant \
	  -f owner=garybayes \
	  -f repo=ta-sandbox \
	  -f telemetry_repo=garybayes/task-assistant-telemetry \
	  -f correlation_id=test-partial-recovery
	Expected:
	- Dashboard succeeds
	- Coverage reflects partial telemetry
	- Telemetry emitted
	- No schema errors

    c) Collect validation evidence
	scripts/validation/capture-test-evidence.sh \
	  garybayes/ta-sandbox \
	  test-11-partial-telemetry
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output
	- docs/validation/results/test-11-partial-telemetry/garybayes-ta-sandbox.json

### 12. Telemetry write blocked
    a) Enable branch protection on telemetry repo

    b) Trigger self-test on garybayes/ta-sandbox
	TARGET_REPO="garybayes/ta-sandbox" \
	  scripts/dispatch/run-self-test.sh
	Expected:
	- Preflight should fail
	- Confirm no new JSONL files created

    c) Collect validation evidence
	scripts/validation/capture-test-evidence.sh \
	  garybayes/ta-sandbox \
	  test-12-telemetry-blocked
	Expected:
	- Preflight or emit fails
	- Explicit error message
	- No partial files created
	- docs/validation/results/test-12-telemetry-blocked/garybayes-ta-sandbox.json

## Phase 3.4 Exit Criteria

### Phase 3.4 testing is complete when:
✅ All tests 1–12 pass
✅ No test produces telemetry on failure paths
✅ No test causes cross-repo telemetry contamination
✅ Dashboard fanout produces consistent results across orgs
✅ Telemetry repo is fully bootstrapped by engines alone
✅ No manual repo mutation is required post-install
📦 Validation evidence consists of:
  - Telemetry records for all tests
  - Engine and telemetry records for tests involving aggregation or recovery behavior

## Marketplace documentation is updated and complete:
docs/marketplace
├── README.md
├── failure-modes.md
├── non-behaviors.md
├── onboarding-flow.md
├── operator-tooling.md
├── permissions-and-auth.md
├── review-q+a.md
├── reviewer-summary.md
├── runtime-components.md
├── submission-form.md
└── telemetry-and-dashboards.md
