Task Assistant — Engine Version Governance Policy (v1.0)

Status: Locked
Applies To: All engine workflows (preflight, validate, enforce, self-test, materialize, dashboard, fanout)
Effective: Phase 3.5
Scope: GitHub App + Telemetry + Dashboard execution integrity

1. Purpose

This policy defines how engine versions are selected, pinned, promoted, and executed.

Objectives:

Prevent silent engine drift

Guarantee reproducible behavior

Ensure Marketplace determinism

Separate development from production

Make cron behavior deterministic

Eliminate ref: main risk

Engines must be version-governed artifacts — not floating references.

2. Terminology

Engine Ref
The Git reference (branch or tag) used when invoking reusable engine workflows.

Example:

uses: automated-assistant-systems/task-assistant/.github/workflows/engine-enforce.yml@v0.3.5


Development Ref
A branch used during active development (e.g. phase-3.6).

Release Ref
An immutable tag (e.g. v0.3.5).

Dispatch Layer
The host repository workflow that invokes engine workflows.

Fanout
Cron-triggered dashboard build orchestrator.

3. Allowed Engine Ref Types
Ref Type	Allowed	Purpose
Feature branch (phase-x.y)	✅ Dev only	Active development
Release branch (release-x.y)	⚠ Optional	Pre-tag stabilization
Immutable tag (vX.Y.Z)	✅ Required for production	Marketplace & cron
main	❌ Forbidden	Drift risk

main must never be used as an engine ref.

4. Execution Modes
4.1 Development Mode

Dispatch may use branch refs

Fanout may use branch refs

CI may use branch refs

Telemetry schema must remain compatible

Purpose: rapid iteration.

4.2 Pre-Release Mode

Engines pinned to release branch

No structural changes allowed

Telemetry validated clean

Dashboard validated clean

No main references permitted

Purpose: stabilization before tagging.

4.3 Production Mode (Marketplace / Cron)

Engines MUST use immutable tag

Dispatch MUST use immutable tag

Fanout MUST use immutable tag

No branch refs permitted

No main refs permitted

Purpose: deterministic execution.

5. Ref Selection Rules
5.1 Dispatch Contract

Dispatch must pass engine_ref explicitly:

with:
  engine_ref: v0.3.5


Dispatch must never assume default branch behavior.

5.2 Engine Workflows

All reusable engine workflows must:

Accept engine_ref input

Checkout Task Assistant using:

ref: ${{ inputs.engine_ref }}


Hardcoded refs are forbidden.

5.3 Fanout

Fanout must:

Declare ENGINE_REF

Pass it into dashboard invocation

Not rely on default branch behavior

Cron execution must be deterministic.

6. CI Enforcement Rules

The repository MUST include a CI guard that fails if:

Any workflow contains ref: main

Any workflow omits engine_ref when calling reusable engines

Any workflow hardcodes branch refs in production mode

Example detection:

grep -r "ref: main" .github/workflows && exit 1

7. Release Promotion Process
Step 1 — Development Complete

Telemetry validator passes

Dashboard build passes

Fanout passes

No schema violations

Step 2 — Branch Freeze

Lock branch

Run full self-test

Run validate

Run enforce

Step 3 — Tag Creation
git tag v0.3.5
git push origin v0.3.5

Step 4 — Ref Update

Update:

Dispatch engine_ref → v0.3.5

Fanout ENGINE_REF → v0.3.5

Step 5 — Marketplace Sync

Ensure Marketplace release tag matches.

8. Version Drift Prevention

Version drift is defined as:

Dispatch invoking one ref

Engine checkout using another ref

Cron using different ref than dispatch

Marketplace tag differing from production execution

Drift is considered a governance violation.

9. Telemetry Compatibility Rule

Engine releases must preserve:

schema_version: "1.0"


Breaking telemetry schema requires:

schema_version bump

new telemetry root (telemetry/v2/)

updated validator

dashboard compatibility layer

Engine version bumps do NOT automatically imply telemetry version bump.

10. Emergency Hotfix Policy

Hotfix procedure:

Create hotfix-x.y.z branch

Patch only required change

Validate telemetry

Tag new version (v0.3.6)

Update dispatch & fanout to new tag

Never modify prior tag

Tags are immutable.

11. Cron Determinism Rule

Scheduled workflows always execute from the default branch version of the workflow file.

Therefore:

The workflow file on main must reference an immutable engine tag.

Cron must never rely on branch engine refs.

This ensures deterministic nightly behavior.

12. Marketplace Integrity Rule

Marketplace reviewers rely on:

Tagged release

Deterministic execution

No hidden ref drift

Marketplace version must correspond exactly to tagged engine version.

13. Governance Checklist (Pre-Tag)

Before tagging:

 No ref: main anywhere

 All engine workflows accept engine_ref

 Dispatch passes engine_ref

 Fanout passes engine_ref

 Telemetry validator passes

 Dashboard build passes

 No transitional validator patches remain

 All tests green

14. Non-Compliance Consequences

Violations may result in:

Silent behavioral drift

Telemetry inconsistency

Dashboard corruption

Marketplace rejection

SaaS execution inconsistency

Version governance is platform-critical.

15. Policy Status

Engine Version Governance v1.0 is:

Required for all production deployments

Required before Phase 3.5 release

Mandatory for SaaS migration

Changes require explicit policy revision.
