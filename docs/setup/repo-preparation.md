Repo Preparation

This document describes how to prepare a GitHub repository for use with Task Assistant using the repo preparation script.

Repo preparation is a declarative, idempotent operation driven entirely by .github/task-assistant.yml.

Purpose

The preparation step exists to:

Create required labels

Create explicitly declared milestones

Validate repository readiness before issues are created

Ensure consistent structure across repos (sandbox, validation, production)

Preparation is intentionally separate from:

issue creation

workflow execution

telemetry validation

Philosophy
1. Configuration is authoritative

The prep script only acts on what is explicitly declared in task-assistant.yml.

It does not:

infer intent

recreate legacy artifacts

guess milestone structure

enforce historical conventions

If something should exist, it must be declared.

2. Prep is safe to re-run

The script is idempotent:

Existing labels → skipped

Existing milestones → skipped

Missing artifacts → created

Invalid config → warned and ignored

This allows preparation to be safely re-run as the repo evolves.

3. No implicit milestones

The script does not create “legacy” milestones unless they are declared in config.

This avoids:

hidden coupling

silent side effects

hard-to-debug validation failures

If a milestone is required for behavior (e.g. sprint enforcement), it must appear in config.

Required Files

A repository must contain:

.github/task-assistant.yml


If this file is missing, preparation will fail immediately.

Configuration Overview
Tracks

Tracks define the allowed workflow paths for issues.

Example:

tracks:
  - id: sprint
    label: track/sprint
    default_milestone_pattern: "Sprint {major}.{minor}"

  - id: backlog
    label: track/backlog


Each track must declare a label.

Tracks may optionally enforce milestones.

Milestones

Milestones are explicitly declared objects.

Example:

milestones:
  - id: sprint-0-1
    title: "Sprint 0.1"
    description: Initial sandbox sprint
    due_offset_days: 14


Required fields:

Field	Purpose
id	Stable identifier used by automation
title	GitHub milestone title
due_offset_days	Relative due date from creation

If any field is missing, the milestone is skipped with a warning.

Running the Prep Script
Dry-run (recommended)
node scripts/prepare-repo.js owner/repo --dry-run


Dry-run will:

show all intended actions

create nothing

validate configuration structure

Apply mode
node scripts/prepare-repo.js owner/repo


Apply mode will:

create missing labels

create missing milestones

skip existing artifacts safely

Output Summary

At the end of execution, the script prints a summary:

Preparation Summary
Created labels:
  - track/sprint

Existing labels:
  - track/backlog

Created milestones:
  - Phase 3.1 – Telemetry Enhancements

Existing milestones:
  - Sprint 0.1


This output is the authoritative record of what changed.

Common Pitfalls (Phase 2 Lessons)
❌ milestones as an object
milestones:
  sprint_pattern: "Sprint {major}.{minor}"


❌ Invalid — will be skipped
✔ Milestones must be an array

❌ Implicit sprint creation

The prep script will not create sprint milestones unless declared.

This avoids accidental coupling between:

validation logic

milestone existence

workflow assumptions

❌ Relying on legacy repo state

Sandbox repos may already contain milestones.

Those milestones must be declared if they are still required.

What Prep Does Not Do

Prep does not:

create issues

assign milestones to issues

run workflows

validate runtime behavior

enforce telemetry rules

Those responsibilities belong to validation and execution phases.

When to Run Prep

Run repo preparation:

when onboarding a new repo

after adding new tracks

after adding new milestones

before bulk issue generation

before Phase transitions

Summary

Repo preparation is:

declarative

explicit

safe

repeatable

configuration-driven

It exists to eliminate hidden state and ensure every repo starts from a known, auditable baseline.

Phase 2 confirmed that this separation is essential for correctness and long-term maintainability.
