Recommended Repository On-Boarding Flow

Task Assistant — Phase 3.3 Canonical

Purpose

This document defines the official, supported sequence for onboarding a repository to Task Assistant.

Following this flow ensures:

Predictable behavior

Deterministic validation

No partial or silent configuration

Alignment with Phase 3.1–3.3 guarantees

This document describes what must exist, what will happen, and what success looks like.

Preconditions (Before You Start)

Before onboarding, ensure:

The Task Assistant GitHub App is installed on the repository

You have repository admin permissions

GitHub Actions are enabled for the repository

⚠️ Task Assistant will not attempt to compensate for missing permissions or disabled Actions.

Step 1 — Prepare the Repository (Idempotent)

Run the preparation script from a trusted environment:

node scripts/prepare-repo.js owner/repo

What prepare-repo Does

Verifies required labels exist (creates missing ones)

Verifies required milestones exist (creates missing ones)

Performs no enforcement

Performs no telemetry writes

Is safe to re-run

Expected Output

Clear confirmation of created vs existing resources

No warnings or errors on a healthy repo

Failure Conditions

Missing permissions

Invalid repository state

GitHub API failures

Failures are explicit and blocking.

Step 2 — Create Configuration File

Create the configuration file at:

.github/task-assistant.yml

Rules

File must exist before workflows run

File must be valid YAML

File must conform to the supported schema

⚠️ Invalid or ambiguous configuration causes early hard failure.
No enforcement or side effects will occur.

Step 3 — Validate Configuration (Automatic)

Validation runs automatically during:

issue-events

self-test

nightly sweep

Validation Guarantees

Runs before enforcement

Fails fast on error

Produces actionable error messages

Produces no partial execution

If validation fails, nothing else runs.

Step 4 — First Successful Workflow Run

After configuration is valid:

Trigger any supported event (e.g., issue update)

Observe the workflow run in GitHub Actions

Expected Signals

Validation step passes

Enforcement (if applicable) runs deterministically

Telemetry is written only to repo-scoped telemetry

No warnings or fallback behavior

This confirms onboarding is complete.

Step 5 — Optional Self-Test Confirmation

(Optional but recommended)

Allow the scheduled self-test workflow to run, or trigger it manually.

Purpose:

Confirm configuration stability

Confirm telemetry integrity

Confirm idempotent behavior

What Task Assistant Does Not Do

Task Assistant will not:

Infer missing configuration

Apply silent defaults

Modify repo state without validation

Write telemetry outside the repository

Continue execution after validation failure

Explicit configuration is always required.

Common Failure Modes
Symptom	Cause	Resolution
Workflow fails immediately	Invalid config	Fix the reported config key
No enforcement occurs	Validation failed	Resolve validation errors
prepare-repo fails	Missing permissions	Grant repo admin access
Repeated failures	Non-idempotent config edits	Restore last known good config
Definition of a Successfully Onboarded Repository

A repository is considered successfully onboarded when:

prepare-repo completes without errors

.github/task-assistant.yml validates cleanly

At least one workflow completes successfully

Telemetry is written only to repo scope

No warnings or fallback behavior are present

Phase Scope Reminder

This onboarding flow reflects Phase 3.3 behavior only.

It does not cover:

Marketplace installation flows

UI dashboards

Advanced customization

Performance or scale considerations

Those are addressed in later phases.

Canonical Principle

If the system is unclear, onboarding is incomplete.

This flow exists to ensure operators never guess.
