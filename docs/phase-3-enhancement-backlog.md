Phase 3 Enhancement Backlog

Task Assistant — Post-Validation Enhancement Phase

Phase Objective

Close the known behavioral gaps identified in Phase 2, expand deployment across repos, and harden telemetry without introducing stress testing yet.

Epic 1 — Milestone Enforcement Logic
TA-E3-01: Enforce Milestone on Milestone-Enabled Tracks

Priority: 🔴 High
Source: Phase 2 failures (dual-track-milestone)

Problem

Tracks configured with default_milestone_pattern do not reliably assign milestones.

Acceptance Criteria

When a milestone-enabled track label is applied:

A matching milestone is assigned

Existing mismatched milestone is corrected

Behavior applies on:

Issue create

Label add

Label switch

TA-E3-02: Track Switch Milestone Enforcement

Priority: 🔴 High
Source: Phase 2 failures (dual-track-switch)

Problem

Switching from non-milestone → milestone track does not apply milestone.

Acceptance Criteria

Removing a non-milestone track and applying a milestone track:

Removes conflicting context

Applies milestone deterministically

No race conditions across workflow runs

Epic 2 — Label Hygiene & Normalization
TA-E3-03: Single-Track Label Normalization

Priority: 🔴 High
Source: Phase 2 failures (label-hygiene)

Problem

Issues can temporarily hold multiple track/* labels.

Acceptance Criteria

At most one track/* label exists per issue

Normalization applies on:

Issue edit

Label add

Label removal

Nightly sweep

TA-E3-04: Track Conflict Telemetry

Priority: 🟡 Medium
Problem

Track conflicts are silently corrected (or not)

Acceptance Criteria

When multiple track labels detected:

Conflict logged to telemetry

Resolution recorded (removed labels, retained label)

Epic 3 — Parent / Child Semantics
TA-E3-05: Explicit Parent → Child Policy Definition

Priority: 🔴 High
Source: Phase 2 failures (parent-child-inheritance)

Problem

“Inheritance” is implied but not enforced or defined.

Decision Required

One of:

❌ No inheritance (explicit opt-in only)

⚠️ Soft inheritance (telemetry-only)

✅ Hard inheritance (track + milestone copied)

Acceptance Criteria

Policy explicitly encoded in config

Validation tests updated to reflect policy

TA-E3-06: Parent Context Telemetry

Priority: 🟡 Medium

Acceptance Criteria

When child issue created:

Parent track/milestone recorded in telemetry

Inheritance decision recorded (applied / skipped)

Epic 4 — Telemetry Enhancements
TA-E3-07: Structured Telemetry Schema v2

Priority: 🔴 High

Problem

Phase 2 evidence proved telemetry value but exposed gaps.

Acceptance Criteria

Introduce versioned telemetry schema:

event_type

trigger

before_state

after_state

decision

reason

Backward compatible where possible

TA-E3-08: Decision Reason Logging

Priority: 🟡 Medium

Acceptance Criteria

Every automated action records:

Why it occurred

Which rule triggered it

Which config value applied

Epic 5 — Multi-Repo Rollout
TA-E3-09: Validation Repo Installation

Priority: 🔴 High

Acceptance Criteria

Task Assistant installed in validation repo

Phase 2 runner passes with expected failures only

TA-E3-10: Work Assistant Repo Installation

Priority: 🔴 High

Acceptance Criteria

Repo prepared via automation

Functional validation executed

Repo-specific edge cases logged

TA-E3-11: Book Repo Installation

Priority: 🟡 Medium

Acceptance Criteria

Tracks adapted for editorial workflow

No assumptions about milestones unless configured

Epic 6 — Validation & Tooling Improvements
TA-E3-12: Phase 3 Functional Test Extensions

Priority: 🟡 Medium

Acceptance Criteria

Add tests for:

New milestone enforcement logic

Parent/child policy

Enhanced telemetry fields

TA-E3-13: Validation Runner UX Improvements

Priority: 🟢 Low

Acceptance Criteria

Clear summary counts (pass/fail/skip)

Optional verbosity flags

Cleaner console output for long runs
