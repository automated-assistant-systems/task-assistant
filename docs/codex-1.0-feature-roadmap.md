CODEX 1.0 — FEATURE ROADMAP

MVP Goal: Deliver a GitHub-native automation and dashboard system that installs in minutes, enforces workflow hygiene, manages sprints, and produces real-time engineering dashboards.

PHASE 1 — Foundation (Weeks 1–3)
1.1 GitHub App Infrastructure

Features

Codex installed through GitHub Marketplace

Repo-level permissions (Issues, Projects, Actions, Pull Requests)

Webhook ingestion (Issues, PRs, Milestones, Workflow Runs, Labels)

OAuth + JWT flow for secure SaaS login

Why this matters
This is the bridge from “local project automation” → “SaaS that works across any repo.”

Deliverables

GitHub App manifest

Installation success screen

Connected repo list

1.2 Codex Cloud Config UI (Core Settings Page)

Features

Select repo(s) to activate Codex

Define codex tracks:

sprint

backlog

support

ops

docs

Set milestone formats: Sprint X.Y, Codex Internal, Release Candidate

Configure stale thresholds

View webhook health

Deliverables

Next.js UI (Tailwind v4)

OAuth session for user → org mapping

Validation for required repo variables

1.3 Multi-Repo Telemetry Collector

Features

Receives all telemetry events produced by your Codex GH Actions

Normalizes events into a unified schema

Stores in Postgres/Supabase

Telemetry types

Issue created/closed/moved

Milestone updated

Label violations

Track violations

Workflow run failures

Stale issue detection

Escalations

Code coverage/test failures (optional but easy to extend)

Deliverables

/events ingestion API

Event queue (bullmq or in-memory for MVP)

Daily aggregation script

PHASE 2 — Automation Engine (Weeks 4–6)
2.1 GitHub Workflow Orchestration

Codex manages the “rules of the repo.”

Features

Auto-label issues based on title/track

Enforce milestone format

Validate sprints

Auto-assign track owners

Enforce required fields

Auto-close abandoned issues

Auto-reopen issues missing required labels

Enforce hygiene (labels, track names, milestones, stale policies)

Track → milestone consistency checks

Deliverables

Rule engine module

YAML templates for Actions

Unified configuration schema

Debug log viewer in UI

2.2 Sprint Engine

Features

Sprint creation helper

Sprint rollover assistant

Automatic issue carry-forward

Auto-assign “Sprint X.Y” milestone

Sprint report generation

Deliverables

/sprint/create and /sprint/rollover API endpoints

Sprint assistant UI page

Milestone timeline chart

2.3 Self-Healing Systems

Codex fixes your repo automatically.

Features

Detect inconsistent labels → auto-fix

Detect missing milestones → apply defaults

Detect missing track → infer + apply

Detect bad or orphaned issues

Detect stale issues → warn → escalate → close

Auto-sync project boards with tracks

Rebuild dashboard if corrupted

Deliverables

Healing engine

Daily “Codex Health Report”

Notifications (email or GitHub comment)

PHASE 3 — Dashboard Layer (Weeks 7–9)
3.1 Codex Dashboard (Codex Cloud)

Your current GitHub Pages version becomes a real SaaS dashboard.

Views

Sprint View

Velocity

Issue movement

Burn-up/burn-down

Track Health

Backlog

Support

Ops

Documentation

Defects

Issue Hygiene

Missing labels

Wrong milestones

Stale issues

Escalations

Automation Health

Workflow run failures

Token scope issues

Misconfigured variables

Deliverables

Next.js dashboard UI

Charts (Recharts or Chart.js)

Org-level and repo-level filters

3.2 Repo Diagnostics Screen

Like a “doctor panel.”

Checks

Missing workflows

Missing repo variables

Incorrect scopes

Inconsistent labels

Project → milestone mismatch

Broken track definitions

Deliverables

Diagnostics engine

UI that shows:

Problem

Location

Suggested fix

“Fix Now” button (GH API call)

PHASE 4 — Integrations (Weeks 10–12)
4.1 Slack / Teams Alerts (Optional for 1.0, but powerful)

Alerts

Workflow failures

Escalations

Stale issues

Sprint rollover warnings

Daily health summary

Deliverables:

Incoming webhook support

Alert templates

4.2 Test Automation Insights (Optional for 1.0)

Codex can ingest test results from CI.

Insights

Flaky tests

Coverage changes

Failed test patterns

Deliverables

/tests ingestion endpoint

Test widget in dashboard

PHASE 5 — Packaging, Billing & Release (Weeks 13–16)
5.1 Pricing

Recommended:

Tier	Repos	Price
Free	1 repo	$0
Starter	5 repos	$9/mo
Pro	20 repos	$29/mo
Enterprise	Unlimited	$99+/mo
5.2 Marketplace Launch Package

Your GitHub Marketplace listing includes:

Description

Features

Screenshots of dashboard

Installation instructions

Trial plan

5.3 Final QA & Beta Testing

You install Codex on all your own repos

Test 10+ different workflows

Validate dashboards

Invite 3–5 private beta testers

Codex 1.0 Feature Summary (Simple List)

Core

GitHub App

Config UI

Multi-repo support

Webhooks + Telemetry

Automation

Track engine

Milestone enforcement

Stale/escalation engine

Self-healing rules

Sprint engine

Dashboard

Sprint view

Track view

Hygiene view

Repo diagnostics

Integrations

Slack/Teams

CI test ingestion (optional)

Packaging

Marketplace listing

Plans & billing

If You Want Next Deliverables

I can now generate any of the following:

✔ Codex 1.0 Architecture Diagram

System-level, repo agent → events → SaaS → dashboards.

✔ Codex 1.0 Data Schema

Tables, events, entities, config objects.

✔ Codex 1.0 Sprint Plan (4 sprints)

Exact tasks for Jules or any developer.

✔ Codex Marketplace Listing (with screenshots placeholders)

Ready for launch.

✔ Codex 1.0 Product Requirements Document (PRD)

Enterprise-ready.
