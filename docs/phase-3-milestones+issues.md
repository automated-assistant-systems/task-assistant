📌 Phase 3 GitHub Milestones & Issues

Repository: task-assistant (and reused across validation / work-assistant / book repos)

🔖 Milestone: Phase 3.1 — Core Behavior Corrections

Goal: Fix correctness gaps proven by Phase 2 validation.

Issue: Enforce milestone on milestone-enabled tracks

ID: TA-E3-01
Labels: track/ops, priority/high, area/milestone, phase/3

Description
Milestone-enabled tracks (default_milestone_pattern) do not reliably assign milestones.

Acceptance Criteria

Applying a milestone-enabled track:

Assigns correct milestone

Replaces mismatched milestone

Applies on:

Issue create

Label add

Label switch

Issue: Enforce milestone on track switch

ID: TA-E3-02
Labels: track/ops, priority/high, area/milestone, phase/3

Description
Switching from non-milestone → milestone track does not apply milestone.

Acceptance Criteria

Track switch enforces milestone deterministically

No race conditions between workflow runs

Issue: Normalize single-track label enforcement

ID: TA-E3-03
Labels: track/ops, priority/high, area/labels, phase/3

Description
Issues may hold multiple track/* labels simultaneously.

Acceptance Criteria

At most one track/* label per issue

Normalization runs on:

Issue edit

Label add/remove

Nightly sweep

Issue: Track conflict telemetry

ID: TA-E3-04
Labels: track/ops, priority/medium, area/telemetry, phase/3

Description
Track conflicts are silently corrected.

Acceptance Criteria

Log conflict detection

Log resolution decision and final state

🔖 Milestone: Phase 3.2 — Parent / Child Semantics

Goal: Remove ambiguity and enforce intentional policy.

Issue: Define parent → child inheritance policy

ID: TA-E3-05
Labels: track/ops, priority/high, area/policy, phase/3

Description
Parent/child behavior is currently undefined.

Acceptance Criteria

Configurable policy:

none | soft | hard

Behavior documented

Validation updated accordingly

Issue: Parent context telemetry

ID: TA-E3-06
Labels: track/ops, priority/medium, area/telemetry, phase/3

Description
Child issues do not record parent context.

Acceptance Criteria

Record parent track & milestone

Record inheritance decision

🔖 Milestone: Phase 3.3 — Telemetry v2

Goal: Make all automation decisions explainable.

Issue: Introduce telemetry schema v2

ID: TA-E3-07
Labels: track/ops, priority/high, area/telemetry, phase/3

Description
Phase 2 showed telemetry gaps.

Acceptance Criteria

Versioned schema with:

event_type

trigger

before_state

after_state

decision

reason

Backward compatible where possible

Issue: Decision reason logging

ID: TA-E3-08
Labels: track/ops, priority/medium, area/telemetry, phase/3

Description
Automation decisions lack rationale.

Acceptance Criteria

Every mutation logs:

Rule applied

Config source

Reason

🔖 Milestone: Phase 3.4 — Multi-Repo Rollout

Goal: Validate behavior across real repo shapes.

Issue: Install Task Assistant in validation repo

ID: TA-E3-09
Labels: track/ops, priority/high, area/install, phase/3

Acceptance Criteria

Repo prepared via automation

Phase 2 runner executed

Known failures only

Issue: Install Task Assistant in work-assistant repo

ID: TA-E3-10
Labels: track/ops, priority/high, area/install, phase/3

Acceptance Criteria

Repo prepared

Functional validation run

Repo-specific edge cases logged

Issue: Install Task Assistant in book repo

ID: TA-E3-11
Labels: track/ops, priority/medium, area/install, phase/3

Acceptance Criteria

Editorial-friendly tracks

No milestone assumptions unless configured

🔖 Milestone: Phase 3.5 — Validation & Tooling

Goal: Keep validation authoritative as features grow.

Issue: Extend Phase 3 functional validation

ID: TA-E3-12
Labels: track/ops, priority/medium, area/validation, phase/3

Acceptance Criteria

Tests for:

New milestone logic

Parent/child policy

Telemetry v2 fields

Issue: Improve validation runner UX

ID: TA-E3-13
Labels: track/ops, priority/low, area/tooling, phase/3

Acceptance Criteria

Summary counts (pass/fail/skip)

Optional verbosity flags

Cleaner console output
