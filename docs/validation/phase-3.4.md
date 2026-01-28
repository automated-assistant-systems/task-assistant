# Phase 3.4 Validation Plan
## Objective
- validate full functionality
- validate full functionality in host repo
- validate multiple orgs running concurrently
- validate multiple repos running concurrently
- validate multiple orgs & multiple repos running concurrently
- full install process
- missing app
- missing secrets
- missing registration
- missing app on telemetry
- missing labels and milestones
- v2 disabled repo
- collect telemetry validation evidence

Concurrent validation means independent execution contexts with overlapping time windows; no shared state or serialization is assumed.

## Repos to Test Against
- automated-assistant-systems/task-assistant-sandbox (v2 registry)
- garybayes/ta-marketplace-install-test (v1 registry)
- garybayes/ta-sandbox (to be created - will be v2 registry)

## Standard Test Scripts
### Reset
scripts/sandbox/reset-sandbox.sh owner/repo --reset-telemetry

Note: --reset-telemetry deletes repo-scoped telemetry directories in the resolved telemetry repo. This flag is required for deterministic validation.

### Install TA
scripts/sandbox/install-task-assistant.sh owner/repo

### Prepare repo (required)
GH_TOKEN=ghp_xxx \
  node scripts/prepare-repo.js \
  owner/repo

### Validate
GITHUB_TOKEN=ghp_xxx \
  GITHUB_REPOSITORY=owner/repo \
  scripts/validate/validate-workflows.sh

### Run Self-Test
TARGET_REPO=owner/repo scripts/dispatch/run-self-test.sh

### Run Validate
TARGET_REPO=owner/repo scripts/dispatch/run-validate.sh

### Run Enforce


### Collect validation evidence
GITHUB_TOKEN=ghp_xxx \
node scripts/infra/resolve-telemetry-repo.js owner/repo

Validation evidence is captured per-repo under docs/validation/results/.

### Prune telemetry
TELEMETRY_REPO=owner/task-assistant-telemetry \
  scripts/telemetry/prune-telemetry.sh repo

### Test Wrapper
GH_TOKEN=ghp_xxx \
scripts/validation/run-validation-test.sh \
  <test-id> \
  <owner/repo>

## Tests
### 1. Validate multiple runs without reset
   a) Reset the repo (v2 registry)
	scripts/sandbox/reset-sandbox.sh \
	  automated-assistant-systems/task-assistant-sandbox \
	  --reset-telemetry
   b) Install Task Assistant (dispatch + config only)
	scripts/sandbox/install-task-assistant.sh \
	  automated-assistant-systems/task-assistant-sandbox

   c) Prepare repo (labels + milestones)
	GH_TOKEN=ghp_xxx \
	  node scripts/prepare-repo.js \
	    automated-assistant-systems/task-assistant-sandbox
	Expected:
	- Labels created
	- Milestones create
	- Exit code 0

   d) Validate (first run)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=automated-assistant-systems/task-assistant-sandbox \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Infra resolves via v2
	- Labels & milestones verified
	- Dispatch workflow verified
	- App access to telemetry verified
	- Validation telemetry emitted
	- Exit code 0

   e) Validate (second run, no reset)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=automated-assistant-systems/task-assistant-sandbox \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Identical to outcome to (d)
	- No errors
	- No duplicate state
	- Exit code 0

    f) Collect validation evidence
	TELEMETRY_REPO=automated-asssistant-systems/task-assistant-telemetry \
	  scripts/telemetry/collect-test-evidence.sh task-assistant-sandbox \
	  docs/validation/results/validation/test-01/automated-asssistant-systems-task-assistant-sandbox.json
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output

### 2. Validate multiple runs without reset in host repo
   a) Reset the repo (v1 registry)
	scripts/sandbox/reset-sandbox.sh \
	  garybayes/ta-marketplace-install-test \
	  --reset-telemetry

   b) Install Task Assistant (dispatch + config only)
	scripts/sandbox/install-task-assistant.sh \
	  garybayes/ta-marketplace-install-test

   c) Prepare repo (labels + milestones)
	GH_TOKEN=ghp_xxx \
	  node scripts/prepare-repo.js \
	    garybayes/ta-marketplace-install-test
	Expected:
	- Labels created
	- Milestones create
	- Exit code 0

   d) Validate (first run)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=garybayes/ta-marketplace-install-test \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Infra resolves via v1 fallback
	- Labels & milestones verified
	- Dispatch workflow verified
	- App access to telemetry verified
	- Validation telemetry emitted
	- Exit code 0

   e) Validate (second run, no reset)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=garybayes/ta-marketplace-install-test \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Identical to outcome to (d)
	- No errors
	- No duplicate state
	- Exit code 0

    f) Collect validation evidence
	TELEMETRY_REPO=garybayes/task-assistant-telemetry \
	  scripts/telemetry/collect-test-evidence.sh ta-marketplace-install-test \
	  docs/validation/results/test-02/garybayes-ta-marketplace-install-test.json
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output

### 3. Validate runs in multiple orgs running concurrently
   a) 1. Reset the repo (v2 registry)
	scripts/sandbox/reset-sandbox.sh \
	  automated-assistant-systems/task-assistant-sandbox \
	  --reset-telemetry

   a) 2. Reset the repo (v1 registry)
	scripts/sandbox/reset-sandbox.sh \
	  garybayes/ta-marketplace-install-test \
	  --reset-telemetry

   b) 1. Install Task Assistant (dispatch + config only)
	scripts/sandbox/install-task-assistant.sh \
	  automated-assistant-systems/task-assistant-sandbox

   b) 2. Install Task Assistant (dispatch + config only)
	scripts/sandbox/install-task-assistant.sh \
	  garybayes/ta-marketplace-install-test

   c) 1. Prepare repo (labels + milestones)
	GH_TOKEN=ghp_xxx \
	  node scripts/prepare-repo.js \
	    automated-assistant-systems/task-assistant-sandbox
	Expected:
	- Labels created
	- Milestones create
	- Exit code 0

   c) 2. Prepare repo (labels + milestones)
	GH_TOKEN=ghp_xxx \
	  node scripts/prepare-repo.js \
	    garybayes/ta-marketplace-install-test
	Expected:
	- Labels created
	- Milestones create
	- Exit code 0

   d) 1. Validate (first run)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=automated-assistant-systems/task-assistant-sandbox \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Infra resolves via v2
	- Labels & milestones verified
	- Dispatch workflow verified
	- App access to telemetry verified
	- Validation telemetry emitted
	- Exit code 0

   d) 2. Validate (first run in second CL)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=garybayes/ta-marketplace-install-test \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Infra resolves via v2
	- Labels & milestones verified
	- Dispatch workflow verified
	- App access to telemetry verified
	- Validation telemetry emitted
	- Exit code 0

   e) 1 Validate (second run, no reset)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=automated-assistant-systems/task-assistant-sandbox \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Identical to outcome to (d)
	- No errors
	- No duplicate state
	- Exit code 0

   e) 2. Validate (second run in second CL, no reset)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=garybayes/ta-marketplace-install-test \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Identical to outcome to (d)
	- No errors
	- No duplicate state
	- Exit code 0

    f) 1. Collect validation evidence
	TELEMETRY_REPO=automated-asssistant-systesm/task-assistant-telemetry \
	  scripts/telemetry/collect-test-evidence.sh task-assistant-sandbox \
	  docs/validation/results/validation/test-03/automated-asssistant-systesm-task-assistant-sandbox.json
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output

    f) 2. Collect validation evidence
	TELEMETRY_REPO=garybayes/task-assistant-telemetry \
	  scripts/telemetry/collect-test-evidence.sh ta-marketplace-install-test \
	  docs/validation/results/test-03/garybayes-ta-marketplace-install-test.json
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output

### 4. Test install process and missing setup failures
   a) Create garybayes/ta-sandbox
	Install Task Assistant (dispatch + config only)
	  scripts/sandbox/install-task-assistant.sh \
	    garybayes/ta-sandbox

   b) Trigger self-test on garybayes/ta-sandbox (not registered)
	gh workflow run engine-self-test.yml \
	  --repo automated-assistant-systems/task-assistant \
	  -f owner=garybayes \
	  -f repo=ta-sandbox \
	  -f telemetry_repo=garybayes/task-assistant-telemetry \
	  -f correlation_id=test-partial-recovery
	Expected:
	- Preflight should fail
	- Confirm no new JSONL files created

   c) Register garybayes/ta-sandbox (v2 registry)
	1. Clone infra repo and create a branch
	  gh repo clone automated-assistant-systems/task-assistant-infra
	  cd task-assistant-infra
	  git checkout -b infra/register-garybayes-ta-sandbox

	2. Register repo using infra CLI (sandbox-safe)
	  ./scripts/infra/infra.sh register garybayes/ta-sandbox \
	    --telemetry-repo garybayes/task-assistant-telemetry \
	    --reason "Phase 3.4 validation sandbox onboarding"

	3. Commit the registry mutation
	  git status
	  git add infra/telemetry-registry.v2.json
	  git commit -m "infra(v2): register garybayes/ta-sandbox for Phase 3.4"

	4. Open PR (required)
	  gh pr create \
	    --title "infra(v2): register garybayes/ta-sandbox" \
	    --body "Registers garybayes/ta-sandbox as a sandbox repo for Phase 3.4 validation."
	Expected:
	✅ CI will run validate-registry-v2.sh
	✅ Merge is the moment of truth — no local shortcuts

	5. Post-merge verification (used in tests)
	  GH_TOKEN=... \
	  node -e '
	  import { resolveInfraForRepo } from "./lib/infra.js";
	  const r = await resolveInfraForRepo({
	    targetRepo: "garybayes/ta-sandbox",
	    githubToken: process.env.GH_TOKEN
	  });
	  console.log(JSON.stringify(r, null, 2));
	  '
	Expected:
	{
	  "versionUsed": "v2",
	  "repoState": "enabled",
	  "telemetryRepo": "garybayes/task-assistant-telemetry",
	  "outcomeCode": "INFRA_OK"
	}

   d) Trigger dashboard build (app not installed)
	gh workflow run engine-dashboard.yml \
	  --repo automated-assistant-systems/task-assistant \
	  -f owner=garybayes \
	  -f repo=ta-sandbox \
	  -f telemetry_repo=garybayes/task-assistant-telemetry \
	  -f correlation_id=test-partial-recovery
	Expected:
	- Dashboard-build should fail on garybayes/ta-sandbox
	- No telemetry emitted

   e) Install app on garybayes/ta-sandbox

   f) Trigger self-test on garybayes/ta-sandbox (no secrets)
	gh workflow run engine-self-test.yml \
	  --repo automated-assistant-systems/task-assistant \
	  -f owner=garybayes \
	  -f repo=ta-sandbox \
	  -f telemetry_repo=garybayes/task-assistant-telemetry \
	  -f correlation_id=test-partial-recovery
	Expected:
	- Preflight should fail
	- Confirm no new JSONL files created

   g) Add secrets
	Use GitHub UI to add CODEX_APP_ID and CODEX_PRIVATE_KEY

   h) Trigger self-test on garybayes/ta-sandbox (no labels or milestones)
	gh workflow run engine-self-test.yml \
	  --repo automated-assistant-systems/task-assistant \
	  -f owner=garybayes \
	  -f repo=ta-sandbox \
	  -f telemetry_repo=garybayes/task-assistant-telemetry \
	  -f correlation_id=test-partial-recovery
	Expected:
	- Preflight should fail
	- Confirm no new JSONL files created

   i) Prepare repo (labels + milestones)
	GH_TOKEN=ghp_xxx \
	  node scripts/prepare-repo.js \
	    garybayes/ta-sandbox
	Expected:
	- Labels created
	- Milestones create
	- Exit code 0

   j) trigger dashboard build
	gh workflow run engine-dashboard.yml \
	  --repo automated-assistant-systems/task-assistant \
	  -f owner=garybayes \
	  -f repo=ta-sandbox \
	  -f telemetry_repo=garybayes/task-assistant-telemetry \
	  -f correlation_id=test-partial-recovery
	Expected:
	- Build directory structure

### 5. Test newly created repo
     a) Validate (new v2 repo)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=garybayes/ta-sandbox \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Infra resolves via v2
	- Labels & milestones verified
	- Dispatch workflow verified
	- App access to telemetry verified
	- Validation telemetry emitted
	- Exit code 0

    b) Collect validation evidence
	TELEMETRY_REPO=garybayes/task-assistant-telemetry \
	  scripts/telemetry/collect-test-evidence.sh ta-sandbox \
	  docs/validation/results/test-05/garybayes-ta-sandbox.json
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output

### 6. Validate multiple repos one org running concurrently
   a) 1. Reset the repo (v2 registry)
	scripts/sandbox/reset-sandbox.sh \
	  garybayes/ta-sandbox \
	  --reset-telemetry

   a) 2. Reset the repo (v1 registry)
	scripts/sandbox/reset-sandbox.sh \
	  garybayes/ta-marketplace-install-test \
	  --reset-telemetry

   b) 1. Install Task Assistant (dispatch + config only)
	scripts/sandbox/install-task-assistant.sh \
	  garybayes/ta-sandbox

   b) 2. Install Task Assistant (dispatch + config only)
	scripts/sandbox/install-task-assistant.sh \
	  garybayes/ta-marketplace-install-test

   c) 1. Prepare repo (labels + milestones)
	GH_TOKEN=ghp_xxx \
	  node scripts/prepare-repo.js \
	    garybayes/ta-sandbox
	Expected:
	- Labels created
	- Milestones create
	- Exit code 0

   c) 2. Prepare repo (labels + milestones)
	GH_TOKEN=ghp_xxx \
	  node scripts/prepare-repo.js \
	    garybayes/ta-marketplace-install-test
	Expected:
	- Labels created
	- Milestones create
	- Exit code 0

   d) 1. Validate (first run)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=garybayes/ta-sandbox \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Infra resolves via v2
	- Labels & milestones verified
	- Dispatch workflow verified
	- App access to telemetry verified
	- Validation telemetry emitted
	- Exit code 0

   d) 2. Validate (first run in second CL)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=garybayes/ta-marketplace-install-test \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Infra resolves via v1 fallback
	- Labels & milestones verified
	- Dispatch workflow verified
	- App access to telemetry verified
	- Validation telemetry emitted
	- Exit code 0

   e) 1. Validate (second run, no reset)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=garybayes/ta-sandbox \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Identical to outcome to (d)
	- No errors
	- No duplicate state
	- Exit code 0

   e) 2. Validate (second run in second CL, no reset)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=garybayes/ta-marketplace-install-test \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Identical to outcome to (d)
	- No errors
	- No duplicate state
	- Exit code 0

    f) 1. Collect validation evidence 
	TELEMETRY_REPO=garybayes/task-assistant-telemetry \
	  scripts/telemetry/collect-test-evidence.sh ta-sandbox \
	  docs/validation/results/test-06/garybayes-ta-sandbox.json
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output

    f) 2. Collect validation evidence
	TELEMETRY_REPO=garybayes/task-assistant-telemetry \
	  scripts/telemetry/collect-test-evidence.sh ta-marketplace-install-test \
	  docs/validation/results/test-06/garybayes-ta-marketplace-install-test.json
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output

### 7. Validate multiple repos & multiple orgs running concurrently
   a) 1. Reset the repo (v2 registry)
	scripts/sandbox/reset-sandbox.sh \
	  automated-assistant-systems/task-assistant-sandbox \
	  --reset-telemetry

   a) 2. Reset the repo (v1 registry)
	scripts/sandbox/reset-sandbox.sh \
	  garybayes/ta-marketplace-install-test \
	  --reset-telemetry

   a) 3. Reset the repo (v1 registry)
	scripts/sandbox/reset-sandbox.sh \
	  garybayes/ta-sandbox \
	  --reset-telemetry

   b) 1. Install Task Assistant (dispatch + config only)
	scripts/sandbox/install-task-assistant.sh \
	  automated-assistant-systems/task-assistant-sandbox

   b) 2. Install Task Assistant (dispatch + config only)
	scripts/sandbox/install-task-assistant.sh \
	  garybayes/ta-marketplace-install-test

   b) 3. Install Task Assistant (dispatch + config only)
	scripts/sandbox/install-task-assistant.sh \
	  garybayes/ta-sandbox

   c) 1. Prepare repo (labels + milestones)
	GH_TOKEN=ghp_xxx \
	  node scripts/prepare-repo.js \
	    automated-assistant-systems/task-assistant-sandbox
	Expected:
	- Labels created
	- Milestones create
	- Exit code 0

   c) 2. Prepare repo (labels + milestones)
	GH_TOKEN=ghp_xxx \
	  node scripts/prepare-repo.js \
	    garybayes/ta-marketplace-install-test
	Expected:
	- Labels created
	- Milestones create
	- Exit code 0

   c) 3. Prepare repo (labels + milestones)
	GH_TOKEN=ghp_xxx \
	  node scripts/prepare-repo.js \
	    garybayes/ta-sandbox
	Expected:
	- Labels created
	- Milestones create
	- Exit code 0

   d) 1. Validate (first run)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=automated-assistant-systems/task-assistant-sandbox \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Infra resolves via v2
	- Labels & milestones verified
	- Dispatch workflow verified
	- App access to telemetry verified
	- Validation telemetry emitted
	- Exit code 0

   d) 2. Validate (first run in second CL)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=garybayes/ta-marketplace-install-test \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Infra resolves via v1 fallback
	- Labels & milestones verified
	- Dispatch workflow verified
	- App access to telemetry verified
	- Validation telemetry emitted
	- Exit code 0

   d) 3. Validate (first run in third CL)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=garybayes/ta-sandbox \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Infra resolves via v2
	- Labels & milestones verified
	- Dispatch workflow verified
	- App access to telemetry verified
	- Validation telemetry emitted
	- Exit code 0

   e) 1. Validate (second run, no reset)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=automated-assistant-systems/task-assistant-sandbox \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Identical to outcome to (d)
	- No errors
	- No duplicate state
	- Exit code 0

   e) 2. Validate (second run in second CL, no reset)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=garybayes/ta-marketplace-install-test \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Identical to outcome to (d)
	- No errors
	- No duplicate state
	- Exit code 0

   e) 3. Validate (second run in third CL, no reset)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=garybayes/ta-sandbox \
	  scripts/validate/validate-workflows.sh
	Expected:
	- Identical to outcome to (d)
	- No errors
	- No duplicate state
	- Exit code 0

    f) 1. Collect validation evidence
	TELEMETRY_REPO=automated-asssistant-systesm/task-assistant-telemetry \
	  scripts/telemetry/collect-test-evidence.sh task-assistant-sandbox \
	  docs/validation/results/validation/test-07/automated-asssistant-systems-task-assistant-sandbox.json
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output

    f) 2. Collect validation evidence
	TELEMETRY_REPO=garybayes/task-assistant-telemetry \
	  scripts/telemetry/collect-test-evidence.sh ta-marketplace-install-test \
	  docs/validation/results/validation/test-07/garybayes-ta-marketplace-install-test.json
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output

    f) 3. Collect validation evidence
	TELEMETRY_REPO=garybayes/task-assistant-telemetry \
	  scripts/telemetry/collect-test-evidence.sh ta-sandbox \
	  docs/validation/results/validation/test-07/garybayes-ta-sandbox.json
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output

### 8. Test app not installed on telemetry repo (both registry versions)
   a) Remove app from garybayes/task-assistant-telemetry

   b) Trigger self-test garybayes/ta-marketplace-install-test (v1 registry)
	gh workflow run engine-self-test.yml \
	  --repo automated-assistant-systems/task-assistant \
	  -f owner=garybayes \
	  -f repo=ta-marketplace-install-test \
	  -f telemetry_repo=garybayes/task-assistant-telemetry \
	  -f correlation_id=test-partial-recovery
	Expected:
	- Preflight should fail
	- Confirm no new JSONL files created

   c) Trigger self-test garybayes/ta-sandbox (v2 registry)
	gh workflow run engine-self-test.yml \
	  --repo automated-assistant-systems/task-assistant \
	  -f owner=garybayes \
	  -f repo=ta-sandbox \
	  -f telemetry_repo=garybayes/task-assistant-telemetry \
	  -f correlation_id=test-partial-recovery
	Expected:
	- Preflight should fail
	- Confirm no new JSONL files created

    d) Collect validation evidence
	TELEMETRY_REPO=garybayes/task-assistant-telemetry \
	  scripts/telemetry/collect-test-evidence.sh ta-sandbox \
	  docs/validation/results/validation/test-08/garybayes-ta-sandbox.json
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output

### 9. Validate repo disabled
   a) Disable automated-assistant-systems/task-assistant-sandbox (v2 registry)

   b) Trigger self-test on automated-assistant-systems/task-assistant-sandbox (v2 registry)
	gh workflow run engine-self-test.yml \
	  --repo automated-assistant-systems/task-assistant \
	  -f owner=automated-assistant-systems \
	  -f repo=task-assistant-sandbox \
	  -f telemetry_repo=garybayes/task-assistant-telemetry \
	  -f correlation_id=test-partial-recovery
	Expected:
	- Preflight should fail
	- Confirm no new JSONL files created

    c) Collect validation evidence
	TELEMETRY_REPO=automated-asssistant-systesm/task-assistant-telemetry \
	  scripts/telemetry/collect-test-evidence.sh task-assistant-sandbox \
	  docs/validation/results/validation/test-09/automated-asssistant-systems-task-assistant-sandbox.json
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output

### 10. Test re-registering repo
    a) Register garybayes/ta-sandbox
	Register repo (v2 registry, PR required)
	1. Clone task-assistant-infra
	2. Run:
	   scripts/infra/infra.sh register garybayes/ta-sandbox \
	     --telemetry-repo garybayes/task-assistant-telemetry \
	     --reason "Phase 3.4 validation sandbox onboarding"
	3. Commit and open PR
	4. Merge PR
	5. Verify via validate-workflows or resolveInfraForRepo

    b) Run the Test Script (scripts/validate/validate-workflows.sh)
	GITHUB_TOKEN=ghp_xxx \
	GITHUB_REPOSITORY=garybayes/ta-sandbox \
	  scripts/validate/validate-workflows.sh
	Expected:
	- No errors
	- No duplicate state

    c) Collect validation evidence
	TELEMETRY_REPO=garybayes/task-assistant-telemetry \
	  scripts/telemetry/collect-test-evidence.sh ta-sandbox \
	  docs/validation/results/validation/test-10/garybayes-ta-sandbox.json
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output

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
	TELEMETRY_REPO=garybayes/task-assistant-telemetry \
	  scripts/telemetry/collect-test-evidence.sh ta-sandbox \
	  docs/validation/results/validation/test-11/garybayes-ta-sandbox.json
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output

### 12. Telemetry write blocked
    a) Enable branch protection on telemetry repo

    b) Trigger self-test
	gh workflow run engine-self-test.yml \
	  --repo automated-assistant-systems/task-assistant \
	  -f owner=garybayes \
	  -f repo=ta-sandbox \
	  -f telemetry_repo=garybayes/task-assistant-telemetry \
	  -f correlation_id=test-partial-recovery
	Expected:
	- Preflight or emit fails
	- Explicit error message
	- No partial files created

    c) Collect validation evidence
	TELEMETRY_REPO=garybayes/task-assistant-telemetry \
	  scripts/telemetry/collect-test-evidence.sh ta-sandbox \
	  docs/validation/results/test-12/garybayes-ta-sandbox.json
	Expected:
	- Validation telemetry
	- Dashboard telemetry
	- Single JSON output

## Phase 3.4 Exit Criteria

### Phase 3.4 is complete when:
✅ All tests 1–12 pass
✅ No test produces telemetry on failure paths
✅ No test causes cross-repo telemetry contamination
✅ v2 registration is the only supported Marketplace path
✅ v1 fallback works without user-visible configuration
✅ Dashboard fanout produces consistent results across orgs
✅ Telemetry repo is fully bootstrapped by engines alone
✅ No manual repo mutation is required post-install
📦 Validation evidence consists of:
- Validation telemetry records for all tests
- Dashboard telemetry records for tests involving aggregation or recovery behavior


