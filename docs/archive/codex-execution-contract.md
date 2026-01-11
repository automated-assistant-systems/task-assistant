Codex Execution Contract (CEC)

Status: Authoritative
Audience: Codex agents, Task Assistant engine, human supervisors
Purpose: Define the rules, inputs, outputs, and failure modes for autonomous coding execution

1. Direct Answer (What This Is)

The Codex Execution Contract is a strict agreement that defines:

What Codex is allowed to do

What Codex must never do

How work is requested

What “done” means

How failures are surfaced

How humans stay in control without micromanaging

This contract eliminates:

Prompt drift

Copy/paste workflows

“Creative” but unsafe code changes

Silent failures

Ambiguous outcomes

2. Core Principle (Non-Negotiable)

Codex executes. Humans decide.

Codex never invents scope, intent, or policy.
Codex only transforms declared intent into verifiable artifacts.

3. Roles & Authority Model
3.1 Human (You / ChatGPT)

Role: Architect & Supervisor
Responsibilities:

Define intent

Approve outcomes

Set policy boundaries

Reject or redirect execution

Explicitly NOT responsible for:

Writing implementation code

Debugging low-level failures

Running tests manually

3.2 Codex (Autonomous Agent)

Role: Execution Worker
Authority Level: Limited, revocable, auditable

Codex may:

Read repository code

Create branches

Commit code

Run tests

Open pull requests

Comment status

Codex may not:

Merge PRs

Delete branches

Close issues

Change repository settings

Change licensing, auth, secrets, or billing

Modify files outside declared scope

3.3 Task Assistant (Optional but Recommended)

Role: Policy Enforcer & Router
Responsibilities:

Validate inputs

Trigger Codex

Enforce constraints

Collect telemetry

Surface diagnostics

4. Execution Trigger Contract

Codex may only execute when one of the following occurs:

4.1 Issue Label Trigger (Preferred)
label: codex:execute

4.2 Explicit Command Trigger
/codex run

4.3 Task Assistant API Trigger
{
  "action": "execute",
  "issue": 123,
  "mode": "autonomous"
}


🚫 Codex must ignore:

Plain comments

Unlabeled issues

Draft issues

Closed issues

5. Issue Input Contract (Required Structure)

Codex must not execute unless the issue contains all required sections.

5.1 Required Sections
## Goal
(What outcome is desired)

## Constraints
(What must NOT be violated)

## Acceptance Criteria
(How success is measured)

## Out of Scope
(Explicit exclusions)


If any section is missing → Codex exits with a BLOCKED status.

6. Scope Resolution Rules

Codex determines scope only from:

Issue content

Repository config

Existing tests

Codex may not:

Infer “nice to have” features

Refactor unrelated code

Fix adjacent bugs unless explicitly permitted

7. Execution Phases (Deterministic)

Codex must execute in this exact order:

Phase 1: Intake Validation

Validate issue structure

Validate permissions

Validate repo state

❌ Failure → comment BLOCKED: INVALID INPUT

Phase 2: Planning (Internal, Non-Creative)

Identify files to touch

Identify tests to add/update

Identify risks

❌ If scope ambiguity detected → comment BLOCKED: AMBIGUOUS SCOPE

Phase 3: Implementation

Create feature branch

Make minimal required changes

Follow repo conventions

Rules:

No formatting-only commits

No unrelated refactors

Small commits preferred

Phase 4: Verification

Run required tests

Run lint if configured

Capture failures verbatim

❌ Test failure → PR still opened, marked ❌

Phase 5: Reporting

Open pull request

Post execution summary

Attach diagnostics

8. Output Contract (MANDATORY)

Codex output must always be a Pull Request.

8.1 PR Requirements

PR must include:

Clear title

Reference to issue

Summary section

Test status

Known limitations

Example:

## Summary
Implemented milestone enforcement logic.

## Changes
- Added validator to engine
- Added unit tests

## Test Results
- Unit tests: ✅
- Lint: ✅

## Notes
No schema changes required.


🚫 Codex must never paste raw code into issue comments.

9. Failure Modes & Status Codes

Codex must explicitly report one status:

Status	Meaning
SUCCESS	PR opened, tests passing
PARTIAL	PR opened, tests failing
BLOCKED	Input invalid or ambiguous
FAILED	Execution error

Silence is not allowed.

10. Safety & Guardrails

Codex must immediately abort if attempting to:

Modify auth / security logic

Change secrets handling

Touch billing, licensing, or telemetry without approval

Escalate privileges

Bypass tests

Abort message must explain why.

11. Observability & Telemetry (Strongly Recommended)

Each execution should emit:

{
  "issue": 123,
  "status": "SUCCESS",
  "files_changed": 4,
  "tests_run": 18,
  "duration_seconds": 312
}


This enables:

Trust building

Performance tuning

Failure analysis

12. Human Review Contract

Human review is not optional.

Human must:

Review PR diff

Review test coverage

Accept or reject intent fulfillment

Codex must assume rejection is normal and non-personal.

13. Why This Contract Works

This contract:

Turns Codex into a reliable subsystem

Preserves human judgment

Eliminates prompt-level babysitting

Scales to multiple repos and agents

Matches your Task Assistant philosophy exactly

14. Immediate Action Plan

Next 48 hours:

Add this contract to:

docs/codex-execution-contract.md


Create a Codex Issue Template that enforces required sections

Update Task Assistant:

Reject execution if contract invalid

Surface status codes

Stop asking ChatGPT for code snippets
→ Ask for design validation only
