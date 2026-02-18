🗂 SPRINT PLAN — Task Assistant 1.0
Duration: 2–3 Weeks
Goal: Marketplace-ready GitHub App + GitHub Action
🚀 SPRINT 1 (Days 1–7 ) — Core Stabilization & Testbed Deployment
🎯 Objectives

Finalize task-assistant-core Action

Finalize task-assistant App repo

Validate workflows + telemetry

Deploy into a test repo

Run the first complete E2E flow

Day 1–2 — Task Assistant-Core Stabilization

Tasks

Fix all remaining TypeScript errors

Add missing types, cleanup strict mode issues

Ensure successful local npm run build

Ensure CI build workflow passes

Tag v1.0.0

Validate GitHub Action metadata (action.yml)

Exit Criteria

task-assistant-core compiles cleanly

GitHub Action workflow passes on main

A stable v1 tag exists

Day 3 — Task Assistant Repo Stabilization

Tasks

Validate all 4 workflows:

task-assistant-issue-events.yml

task-assistant-nightly-sweep.yml

task-assistant-dashboard-build.yml

task-assistant-self-test.yml

Fix permissions issues (remove invalid keys like metadata)

Validate yamllint compliance

Add final README

Add documentation links

Exit Criteria

All workflows pass schema validation

README provides correct install instructions

Self-Test workflow passes locally

Day 4–5 — Create a Testbed Repo & Deploy Task Assistant

Repo: task-assistant-sandbox

Tasks

Install the GitHub App

Add task-assistant.yml

Add workflows

Trigger events:

Open issue

Label change

Milestone creation

Stale test (simulate timestamps)

Validate telemetry:

events/*.json

diagnostics.json

dashboard/dashboard.json

Exit Criteria

Issue automation works

Telemetry files appear correctly

Dashboard builds successfully

Nightly sweep works in manual mode

Day 6–7 — Polish & Document

Tasks

Document the telemetry model

Document expected directory structure

Finalize dashboard.json schema

Improve error messages in task-assistant-core

Add basic examples to docs

Exit Criteria

All documentation inside /docs validated

No workflow errors appear in testbed

Task Assistant 1.0 is now test-deployable

🌙 END OF SPRINT 1: Task Assistant is functional.
🚀 SPRINT 2 (Days 8–14) — Dogfooding + SaaS-App Migration
🎯 Objectives

Run Task Assistant on real repos

Retire Codex from Work Assistant (formerly SaaS-App)

Validate Task Assistant under high complexity

Ensure telemetry stability

Confirm self-healing logic in production-like environment

Day 8–9 — Dogfood in Task Assistant Repos

Deploy into:

📌 task-assistant
📌 task-assistant-core

Tasks

Add task-assistant.yml tuned for internal repos

Test:

Issue creation

PR linking

Milestone progression

Track assignment

Validate recursion safety (self-hosting edge cases)

Exit Criteria

Task Assistant can manage itself

No infinite loops

All telemetry directory writes succeed

Day 10–12 — Work Assistant Migration

Tasks

Remove old Codex workflows

Install Task Assistant App

Add workflows and task-assistant.yml

Validate track rules:

sprint

backlog

bug

chores

Validate milestone cadence

Validate nightly sweeps

Test integration with existing CI

Resolve file conflicts (telemetry merges)

Exit Criteria

Work Assistant repo operates exclusively under Task Assistant

All tests pass

Dashboard shows realistic sprint health

No workflow conflicts

Day 13–14 — Stability, Bug Fixes, Optimization

Tasks

Fix any telemetry merge collisions

Harden task-assistant-core for null fields

Add retry logic for GitHub API rate limits

Polish logs and error messages

Add version bump script

Exit Criteria

All repos stable for 48 hours

No workflow failures

No telemetry write errors

No stale edge-case failures

🌙 END OF SPRINT 2: Task Assistant is production-ready.
🚀 SPRINT 3 (Days 15–21) — Book Repo, Marketplace Prep, Final Release
🎯 Objectives

Validate Task Assistant in a documentation-heavy repo

Prepare GitHub Marketplace listing

Finalize branding

Release to public

Day 15–16 — Deploy to the Book Repo

Tasks

Install Task Assistant in book repo

Add workflows

Tune configuration to writing workflow:

content

draft

editing

approved

Validate:

Issue lifecycle for chapters

Milestone: “Edition 1.0”

Dashboard.json showing chapter readiness

Exit Criteria

Task Assistant works outside engineering repos

Dashboards reflect progress correctly

Day 17–18 — Prepare GitHub Marketplace Release

Tasks

Prepare App metadata

Create branding assets:

Icon (1024×1024)

Banner

Write Marketplace listing:

tagline

description

features

install instructions

permissions summary

pricing (free for now)

Add privacy policy + terms (minimal)

Exit Criteria

Marketplace listing draft complete

Branding finalized

App ready for submission

Day 19–21 — Final QA + Marketplace Submission

Tasks

Test installation from scratch in a fresh repo

Validate:

Permissions

Webhook events (if any)

Telemetry

Dashboard

Check all README links

Run final Self-Test

Submit App review to GitHub Marketplace

Exit Criteria

GitHub Marketplace submission complete

Task Assistant v1.0 is ready for users

⭐ Total Expected Duration: 2–3 weeks

With your pace and current progress, 17–19 days is realistic.
If you push heavily, 7–10 days is possible.

🐛 RISK MANAGEMENT (Recommended Additions)
Risk	Mitigation
Workflow recursion	Ensure Action logic skips its own telemetry commits
Telemetry merge conflicts	Use timestamp-based filenames (already done)
Permission mismatches	Use GITHUB_TOKEN only; validate scopes
Stale detection edge cases	Add date normalization logic
Marketplace audit failures	Ensure permissions list is minimal & documented
📊 High-Level Timeline Summary
WEEK 1: Stabilize + Testbed repo
WEEK 2: Dogfooding + SaaS-App integration
WEEK 3: Book repo + Marketplace release
