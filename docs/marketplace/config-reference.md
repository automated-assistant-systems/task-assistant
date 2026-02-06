# Task Assistant for GitHub — Configuration Reference

This document describes the declarative configuration file used by **Task Assistant for GitHub**.

The configuration file defines repository hygiene rules, enforcement behavior, and expected repository structure.

It does **not** contain executable logic.

💡 New to Task Assistant?  
Start with the **Config Evolution Guide** before enabling enforcement:
`docs/config/config-evolution.md`

---

## Configuration File Location

Task Assistant reads a single configuration file from the repository:

.github/task-assistant.yml


If this file is missing or invalid:

- Enforcement does not run
- Validation reports errors
- No repository mutations occur

This is expected and safe behavior.

---

## Configuration Model Overview

The configuration file is declarative and deterministic.

It defines:

- Work tracks
- Labels
- Milestones
- Enforcement rules

All behavior must be explicitly configured.
There are no defaults that mutate repository state.

---

## Top-Level Structure

```yaml
schema_version: "1.0"

tracks:
  - ...

labels:
  - ...

milestones:
  - ...

enforcement:
  ...

### schema_version

schema_version: "1.0"
- Required
- Must be a supported version string
- Used to ensure forward compatibility

If the schema version is unsupported, validation fails and enforcement does not run.

### tracks

Tracks define mutually exclusive categories of work (e.g., sprint vs backlog).

Structure

tracks:
  - id: sprint
    label: track/sprint
    description: Active sprint work

  - id: backlog
    label: track/backlog
    description: Planned but unscheduled work

Fields
Field		Required	Description
id		Yes		Internal identifier used in enforcement rules
label		Yes		GitHub label representing the track
description	No		Human-readable description

Behavior
- Track labels are mutually exclusive
- Enforcement can ensure only one track label is present
- Track labels are metadata only (no code changes)

### labels

Defines labels that Task Assistant expects to exist.

Structure

labels:
  - name: phase-1
    description: Phase 1 work
    color: "0E8A16"

  - name: phase-2
    description: Phase 2 work
    color: "B60205"

Fields
Field		Required	Description
name		Yes		GitHub label name
description	No		Label description
color		Yes		Hex color (without #)

Behavior
- Labels are not created automatically
- Labels can be materialized via manual workflow
- Enforcement rules may reference these labels

### milestones

Defines milestones that Task Assistant expects to exist.

Structure

milestones:
  - title: "Phase 1 – Planning"
  - title: "Phase 2 – Execution"

Fields
Field	Required	Description
title	Yes		GitHub milestone title

Behavior
- Milestones are not created automatically
- Milestones can be materialized via manual workflow
- Enforcement rules may reference milestones

### enforcement

Defines how Task Assistant responds to repository events.

All enforcement behavior is explicit.
If a rule is not configured, it does not run.

### enforcement.exclusivity

Ensures that only one label in a group may be present.

Structure

enforcement:
  exclusivity:
    phase:
      mode: enforce
      strategy: highest

Fields
Field		Description
mode		enforce or warn
strategy	Resolution strategy (e.g., highest)

Behavior
- Triggered on issue updates
- Resolves conflicting labels deterministically
- Never speculative

### enforcement.phase_milestones

Maps phase labels to milestones.

Structure

enforcement:
  phase_milestones:
    phase-1: "Phase 1 – Planning"
    phase-2: "Phase 2 – Execution"

Behavior
- When a phase label is applied:
  - The corresponding milestone is set
- If no mapping exists:
  - No action is taken
- Does not create milestones automatically

## Validation Behavior

Validation runs:
- On configuration file push
- On scheduled workflows
= On manual validation dispatch

Validation checks:
- Schema correctness
- Required fields
- Referential integrity (labels, milestones)
- Enforcement rule consistency

If validation fails:
- Enforcement does not run
- No repository mutations occur
- Errors are visible in GitHub Actions logs

## Materialization (Labels & Milestones)

Task Assistant does not automatically create labels or milestones.

To create missing items defined in the configuration:
1. Go to Actions → Task Assistant • Dispatch
2. Run with mode: materialize

Materialization:
- Creates only what is defined in configuration
- Is deterministic
- Is safe to re-run
- Emits telemetry describing changes

## What This Configuration Cannot Do

The configuration file cannot:
- Modify source code
- Create pull requests
- Delete branches
- Run scripts
- Trigger cross-repository actions
- Perform speculative behavior

All behavior is constrained to repository metadata and explicitly configured rules.

## Summary

The Task Assistant configuration file is:
- Declarative
- Deterministic
- Explicit
- Auditable
- Safe by default

Nothing happens unless you configure it.
Nothing mutates your repository without intent.

This design is intentional.

## Appendix A — Minimal Starter Configuration

This example is the smallest useful configuration that allows Task Assistant for GitHub to:

Validate successfully

Run enforcement safely

Be expanded later without breaking changes

It is suitable for a fresh Marketplace install.

### Minimal Valid Configuration

schema_version: "1.0"

tracks:
  - id: backlog
    label: track/backlog
    description: Unscheduled work

labels:
  - name: track/backlog
    description: Default work track
    color: "EDEDED"

milestones: []

enforcement: {}

### What This Configuration Does

✔ Passes schema validation
✔ Enables the dispatch workflow to run
✔ Emits telemetry during validation
✔ Performs no enforcement actions
✔ Makes no repository mutations

This is intentional.

### Why This Is the Recommended Starting Point

- No assumptions about workflow style
- No automatic issue mutation
- No milestone coupling
- No exclusivity rules
- No phase logic

Users can safely install Task Assistant, confirm it runs, and then evolve configuration incrementally.

### Common First Extensions

After confirming the starter config works, most users add one of the following:

Add a second track

tracks:
  - id: backlog
    label: track/backlog
    description: Unscheduled work

  - id: sprint
    label: track/sprint
    description: Active sprint work

Add label exclusivity.

enforcement:
  exclusivity:
    tracks:
      mode: enforce
      strategy: single

Add phase milestones

milestones:
  - title: "Phase 1 – Planning"
  - title: "Phase 2 – Execution"

enforcement:
  phase_milestones:
    phase-1: "Phase 1 – Planning"
    phase-2: "Phase 2 – Execution"

### What This Starter Config Avoids (On Purpose)

It does not:
- Create labels or milestones automatically
- Enforce issue transitions
- Require materialization
- Change issue state
- Assume a delivery methodology

Those behaviors should be added deliberately, not by default.

### Recommended First Validation Step

After committing .github/task-assistant.yml:
1. Go to Actions → Task Assistant • Dispatch
2. Run with mode: validate
3. Confirm validation succeeds
4. Review emitted telemetry (optional)

Only then should enforcement rules be added.

### Summary

This starter configuration exists to answer one question:

“Is Task Assistant installed and working?”

Nothing more.

Everything else is opt-in.
