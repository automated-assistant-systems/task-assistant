# Task Assistant for GitHub — Config Evolution Guide

This guide shows safe, incremental ways to evolve a Task Assistant configuration from a fresh install to advanced enforcement.

The goal is simple:

Every step should validate, run, and emit telemetry without surprising mutations.


## Level 0 — Installed, But Doing Nothing (Baseline)

### Purpose:

Confirm the app is installed correctly and can validate configuration.

### What runs:

- Validation
- Telemetry emission

### What does NOT happen:

- No enforcement
- No repo mutation

### Configuration

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


### When to use:
Immediately after Marketplace install.

## Level 1 — Structural Awareness (Multiple Tracks)

### Purpose:
Let Task Assistant understand how work is categorized.

### What changes:

- Multiple tracks exist
- Still no enforcement

### Configuration Change

tracks:
  - id: backlog
    label: track/backlog
    description: Unscheduled work

  - id: sprint
    label: track/sprint
    description: Active sprint work

labels:
  - name: track/backlog
    color: "EDEDED"

  - name: track/sprint
    color: "C2E0C6"


### Behavior:
✔ Validates
✔ Telemetry emitted
✖ No issue mutation

## Level 2 — Gentle Enforcement (Exclusive Tracks)

### Purpose:

Prevent ambiguous issue state (e.g., multiple tracks at once).

First meaningful automation step.

### Configuration Change

enforcement:
  exclusivity:
    tracks:
      mode: enforce
      strategy: single


### Behavior:
- An issue can only have one track label
- If multiple are applied, Task Assistant resolves deterministically
- Enforcement is limited to labels only

### Safe because:
- No issue deletion
- No state transitions
- Deterministic outcomes

## Level 3 — Phase Awareness (Milestones)

### Purpose:
Introduce structured progress without automation.

### Configuration Change
milestones:
  - title: "Phase 1 – Planning"
  - title: "Phase 2 – Execution"
  - title: "Phase 3 – Review"


### Behavior:
✔ Validation checks milestone existence
✔ Telemetry records phase awareness
✖ No automatic milestone assignment

## Level 4 — Phase Enforcement (Controlled Automation)

### Purpose:
Ensure issues align with project phases.

### Configuration Change

enforcement:
  phase_milestones:
    phase-1: "Phase 1 – Planning"
    phase-2: "Phase 2 – Execution"
    phase-3: "Phase 3 – Review"


### Behavior:
- Issues entering a phase must reference a valid milestone
- Invalid transitions are corrected deterministically

### Still safe because:
- Enforcement is metadata-only
- No code changes
- No speculative behavior

## Level 5 — Advanced Enforcement (Optional)

### Purpose:
Strict hygiene for mature teams.

Examples (not exhaustive):
- Required labels per track
- Issue state normalization
- Phase-to-track coupling
- Deterministic reopening / relabeling rules

At this level, telemetry review becomes essential before expanding rules.

### Safe Upgrade Rules (Important)

When evolving config:

✔ Add rules before tightening them
✔ Validate after every change
✔ Use manual dispatch → validate first
✔ Review telemetry before enabling enforcement
✖ Do not introduce multiple enforcement types at once

## Rollback Strategy

If something behaves unexpectedly:
1. Revert .github/task-assistant.yml
2. Commit and push
3. Run validate
4. Telemetry will reflect both versions

No cleanup is required.

### Mental Model Summary
Level	Risk	Automation	Recommended For
0	None	❌		Fresh installs
1	None	❌		Planning
2	Low	✅ Labels	Small teams
3	Low	❌		Phase tracking
4	Medium	✅ Metadata	Structured projects
5	Higher	✅ Advanced	Mature workflows

## Final Note

Task Assistant is intentionally not opinionated.

You decide:

- When enforcement starts
- What is enforced
- How strict it becomes

This guide exists to make sure you never have to guess.

## Appendix — “What Changed?” Telemetry Examples

This appendix shows exactly what telemetry changes as a configuration evolves.

The goal is to help operators answer one question with certainty:

“What new behavior became active when I changed the config?”

Each example shows only the delta, not full payloads.

### Level 0 → Level 1
From “Installed” to “Validated”

Change introduced
- Configuration file added
- No enforcement rules enabled

What Task Assistant does
- Validates configuration schema
- Performs repository inspection
- Emits telemetry only

New telemetry events

{
  "event_type": "config.validated",
  "config_version": "1",
  "result": "success"
}

{
  "event_type": "repo.inspected",
  "labels_checked": true,
  "milestones_checked": true
}


What does not appear

- No enforcement events
- No mutations
- No issue actions

✔ Safe
✔ Zero behavior change
✔ Auditable baseline

### Level 1 → Level 2
From “Validated” to “Single Enforcement Rule”

Change introduced

- One explicit enforcement rule added
  (example: required label)

What Task Assistant does
- Enforcement engine activates
- Still deterministic and scoped

New telemetry events

{
  "event_type": "enforcement.evaluated",
  "rule_id": "require-label",
  "trigger": "issue.labeled",
  "result": "pass"
}


If enforcement applies:

{
  "event_type": "enforcement.applied",
  "rule_id": "require-label",
  "action": "label_added",
  "target": "issue",
  "value": "priority/medium"
}


What remains unchanged

- Telemetry path
- Dashboard structure
- Other repos unaffected

✔ One rule
✔ One behavior
✔ One observable change

### Level 2 → Level 3
From “Single Rule” to “Multiple Rules”

Change introduced
- Additional rules enabled
- Possible interaction between rules

What Task Assistant does
- Evaluates rules independently
- Emits per-rule telemetry

New telemetry pattern

{
  "event_type": "enforcement.evaluated",
  "rule_id": "require-milestone",
  "result": "fail"
}

{
  "event_type": "enforcement.evaluated",
  "rule_id": "require-label",
  "result": "pass"
}


If multiple actions occur:

{
  "event_type": "enforcement.summary",
  "rules_evaluated": 2,
  "rules_applied": 1
}

Key guarantee
- Rules do not cascade
- Each rule is logged independently

✔ Predictable
✔ Composable
✔ Debuggable

### Level 3 → Advanced
Tightening or Changing Existing Rules

Change introduced
- Rule parameters adjusted
- No new rule types added

Telemetry difference
- Same event types
- Different rule metadata

{
  "event_type": "enforcement.evaluated",
  "rule_id": "require-label",
  "parameters": {
    "allowed": ["priority/high"]
  }
}


Important
- No silent upgrades
- No implicit behavior changes
- Telemetry always reflects current config

✔ Safe evolution
✔ Clear rollback path

### Reading Telemetry Safely

You can always answer:

Question			Telemetry Signal
What activated enforcement?	enforcement.evaluated appears
What rule fired?		rule_id
What changed?			enforcement.applied
Did anything mutate?		Action events only
Why did it happen?		Parameters + correlation_id

### Summary (Operator Mental Model)

  Config change → Telemetry change → Optional behavior change

Nothing else.

No hidden transitions.
No silent enforcement.
No retroactive effects.

### Config Evolution — Behavior & Telemetry Diff Table

Config Level	What Changed	New Behavior	New Telemetry Emitted	What Does Not Change
		in Config	Activated

Level 0		App installed	❌ Nothing runs	❌ No telemetry		No enforcement
Installed only	No config file						No mutations
									No dashboards

Level 1		.github/task-	✅ Validation	config.validated	No enforcement
Config added	assistant.yml	   only		repo.inspected		No issue changes
		added

Level 2		One explicit	✅ Targeted	enforcement.evaluated	Other rules inactive
Single rule	rule enabled	   enforcement	enforcement.applied	No cascades
						(if applicable)

Level 3		Additional	✅ Multiple	One
Multiple rules	rules enabled	   independent	enforcement.evaluated	Rules don’t interact
rules				   checks	per rule Optional	No cross-repo
						enforcement.summary	effects

Level 4		Rule parameters	🔄 Same		Same event types	No new rule types
Rule tuning	changed		   behavior,	Updated parameters	No silent upgrades
				   tighter	recorded
				   scope

Any Level	Config removed	❌ Enforcement	config.invalid or	No mutations
		or invalid	   halts	validation error	No enforcement

Any Level	Telemetry	❌ No behavior	Dashboard shows error	Raw telemetry
		missing/	   change	state			untouched
		malformed

Any Level	Workflow	❌ No behavior	Failure visible in	No repo state
		failure		   change	Actions logs only	changes

