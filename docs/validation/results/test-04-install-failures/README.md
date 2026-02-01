Test 04 — Install Process & Missing Setup Failures
Purpose

Test 04 validates that Task Assistant fails safely and deterministically when required installation or configuration steps are missing.

This test proves that:

The app does not partially execute

No telemetry is emitted during invalid states

Failures are explicit, explainable, and reversible

Recovery is possible once prerequisites are satisfied

This is a negative-path validation test and is critical for Marketplace readiness.

Scope

This test focuses on a new sandbox repository:

garybayes/ta-sandbox


The repository is intentionally brought through incomplete and invalid states, and the system’s behavior is observed at each step.

No concurrency is involved in this test.

Evidence Collection Strategy

Evidence is captured using a read-only helper:

scripts/validation/capture-test-04-evidence.sh


Each capture records:

Infra resolution state

Telemetry directory presence or absence

Repo hygiene (labels, milestones)

Recent workflow execution context

Each step produces an immutable snapshot directory.

Test Steps & Expected Evidence
Step A — Install App (No Infra, No Secrets)

Action

Install Task Assistant on garybayes/ta-sandbox

No infra registration

No secrets

No labels or milestones

Expected

App installs successfully

No workflows execute

No telemetry created

Evidence

infra-resolution.json shows unregistered repo

telemetry-tree.txt indicates no telemetry directory

Step B — Self-Test (Unregistered Repo)

Action

gh workflow run engine-self-test.yml \
  --repo automated-assistant-systems/task-assistant \
  -f owner=garybayes \
  -f repo=ta-sandbox \
  -f telemetry_repo=garybayes/task-assistant-telemetry


Expected

Preflight fails

Execution halts

No telemetry emitted

Evidence

Workflow failure visible

Telemetry directory absent or unchanged

Step C — Infra Registration (v2)

Action

Register repo in infra v2 registry

Merge via PR (no local bypass)

Expected

Infra resolution returns INFRA_OK

Repo state becomes sandbox / enabled

Evidence

infra-resolution.json reflects new state

Registry SHA updated

Step D — Dashboard Build (App Not Installed)

Action

gh workflow run engine-dashboard.yml


Expected

Dashboard build fails

No telemetry emitted

Evidence

Workflow failure

No telemetry directories created

Step E — Install App (Post-Infra)

Action

Install Task Assistant again

Expected

App installs cleanly

Still no execution without secrets

Evidence

Repo accessible

No telemetry yet

Step F — Self-Test (No Secrets)

Action

Trigger self-test

Expected

Preflight fails due to missing secrets

No telemetry emitted

Evidence

Preflight failure

No JSONL files created

Step G — Add Secrets

Action

Add CODEX_APP_ID

Add CODEX_PRIVATE_KEY

Expected

Secrets visible to app

Execution still blocked by missing repo prep

Step H — Self-Test (No Labels / Milestones)

Expected

Preflight fails

No telemetry emitted

Evidence

Failure reason references missing setup

Telemetry remains empty

Step I — Prepare Repo

Action

node scripts/prepare-repo.js garybayes/ta-sandbox


Expected

Labels created

Milestones created

Exit code 0

Evidence

Labels and milestones visible

No errors

Step J — Dashboard Build (Fully Ready)

Action

gh workflow run engine-dashboard.yml


Expected

Dashboard build succeeds

Telemetry directory structure created

Evidence

Telemetry tree present

Dashboard artifacts generated

Success Criteria

Test 04 passes if all of the following are true:

❌ No telemetry is emitted during invalid states

❌ No partial execution occurs

✅ Failures are explicit and explainable

✅ Recovery works after prerequisites are satisfied

✅ Telemetry appears only after full readiness

Why This Test Matters

This test demonstrates that Task Assistant:

Is safe by default

Prevents silent misconfiguration

Protects user repositories from partial automation

Supports predictable onboarding and recovery

These properties are essential for GitHub Marketplace approval.

Related Tests

Test 01 — Basic sandbox validation

Test 02 — Hosted / personal org validation

Test 03 — Multi-org enforcement concurrency

Test 05 — Repo recovery after failed onboarding
