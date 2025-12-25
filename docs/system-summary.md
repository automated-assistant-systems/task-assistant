#Authoritative - supersedes all prior docs
Task Assistant — System Summary (Authoritative)

Status: ✅ GitHub App + Core fully operational
Date: 2025-12-14
Phase: Post-MVP / Stabilized Infrastructure

1. System Overview

Task Assistant is split into two deliberately separate components:

A. task-assistant-core (Engine)

Pure task assistant engine

No GitHub App concepts

No webhook handling

No Express server

No installation logic

Stateless and environment-agnostic

Can run in:

GitHub Actions

GitHub Apps

Local/test harnesses

B. task-assistant (GitHub App)

GitHub App + webhook server

Owns:

App authentication

Installation token generation

Webhook verification

Dispatching events into core

Uses core as a library

Runs locally via Express + ngrok during development

2. Execution Modes (Confirmed Working)
GitHub App Mode ✅

App installed on repository

Issues trigger webhook events

Webhooks verified using shared secret

Installation-scoped Octokit created correctly

Issue events dispatched to runCore

Labels, milestones, telemetry applied successfully

GitHub Actions Mode ✅

action.ts serves as GitHub Action entrypoint

Uses @actions/core and @actions/github

Runs runAction() which delegates to run()

Uses GITHUB_TOKEN only in Action context

3. Authentication Model (Final)
GitHub App Authentication

Uses GitHub App ID + Private Key

Installation token generated per event

No user tokens

No PATs

App credentials loaded from environment

Environment Variables (App)
APP_ID=2454517
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
WEBHOOK_SECRET=********
PORT=3000
NODE_ENV=development

AppEnv (Canonical)
export interface AppEnv {
  GITHUB_APP_ID: number;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_WEBHOOK_SECRET: string;
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
}

4. Webhook Flow (Verified End-to-End)

Issue created or updated in GitHub

GitHub sends webhook → ngrok URL

Express server receives webhook

@octokit/webhooks verifies signature

GitHub App creates installation-scoped Octokit

dispatchIssueEvent() invoked

runCore() executed with:

owner

repo

issue payload

installation token

Core applies:

Track classification

Labels (if missing)

Milestones (if configured)

Telemetry output

5. Core Responsibilities (Final)

task-assistant-core does only:

Issue classification

Track inference

Self-healing rules

Milestone enforcement

Telemetry generation

Deterministic task assistant logic

Core never:

Reads App credentials

Handles webhooks

Starts servers

Assumes GitHub Actions context unless explicitly invoked

6. Dispatcher Contract (Final)
export interface DispatchContext {
  octokit: Octokit;
  owner: string;
  repo: string;
}


Dispatcher:

Receives installation-scoped Octokit

Extracts issue payload

Calls runCore()

Core handles everything else

7. Verified Success Criteria (All Met)

✅ ngrok tunnel active and receiving traffic

✅ Webhook deliveries visible in ngrok inspector

✅ GitHub App installed on orchestrator repo

✅ Issue creation triggers processing

✅ Labels and milestones applied

✅ Telemetry written

✅ No auth errors

✅ No missing App ID / private key errors

✅ Both Action + App paths proven

8. Known Sharp Edges (Documented)

These are expected, not bugs:

TypeScript NodeNext requires explicit .js imports

Octokit type differences between octokit packages

Core must not auto-execute except in Action mode

App and Core must never share env loaders

App must be installed on a repo for events to fire

Installing core does NOT install the GitHub App

9. Repository State

Both repos build cleanly

App runs locally with:

npm run dev


Core packaged and consumable as library

Task Assistant app successfully processes real GitHub issues

10. What Comes Next (New Thread Scope)

Out of scope for this summary:

Feature expansion

Rule DSL

Telemetry dashboards

Marketplace hardening

Multi-repo orchestration

Monetization

Those belong in the next clean thread.

11. Canonical Declaration

This summary represents the current, correct system state.
Prior debugging history is obsolete and should not be referenced.
