Task Assistant — GitHub App Onboarding Flow (Authoritative)
Purpose

This onboarding flow installs Task Assistant into a repository without copying engine code and without granting unsafe permissions.

After onboarding:

The host repo contains only:

Configuration (.github/task-assistant.yml)

Dispatcher (task-assistant-dispatch.yml)

All engines run from the Task Assistant App repo

Telemetry is written only to the org’s telemetry repo

High-Level Architecture (Mental Model)
User Repo (Host)
├─ .github/task-assistant.yml        ← config only
├─ .github/workflows/
│  └─ task-assistant-dispatch.yml    ← dispatcher only
│
└─ (NO engines, NO scripts)

Task Assistant App Repo
├─ engine-self-test.yml
├─ engine-validate.yml
├─ engine-enforce.yml
├─ engine-dashboard.yml
└─ runtime scripts

Org Telemetry Repo
└─ telemetry/v1/repos/<repo>/*.jsonl

Onboarding Flow (Step-by-Step)
Step 1 — Install the GitHub App

Actor: Org Owner / Repo Admin
UI: GitHub Marketplace

Navigate to Task Assistant on GitHub Marketplace

Click Install

Choose:

Entire organization or

Selected repositories

Confirm permissions

Permissions Granted

Issues: read/write

Contents: write (telemetry repos only)

Metadata: read

🔒 The App cannot act outside the repositories you approve.

Step 2 — Create the Org Telemetry Repository (Once per Org)

Repo name (required):

<owner>/task-assistant-telemetry


Purpose:

Stores all enforcement, validation, dashboard, and audit events

Isolated per organization (no cross-org leakage)

This repo can be:

Private (recommended)

Public (optional, for transparency)

Step 3 — Add Required Secrets (Per Repo or Org)

Task Assistant requires two secrets to operate:

Secret Name	Value
CODEX_APP_ID	GitHub App ID
CODEX_PRIVATE_KEY	GitHub App private key (.pem)
How to Add
gh secret set CODEX_APP_ID --repo <owner/repo> --body <app-id>
gh secret set CODEX_PRIVATE_KEY --repo <owner/repo> --body-file key.pem


💡 These may also be set as org-level secrets with access granted to selected repos.

Step 4 — Install Task Assistant Files (Config + Dispatch Only)

Method: Automated installer (recommended)
What gets installed:

.github/task-assistant.yml
.github/workflows/task-assistant-dispatch.yml


What does NOT get installed:

❌ Engines

❌ Scripts

❌ Telemetry logic

❌ Runtime code

Dry-Run Validation (Recommended First)
scripts/sandbox/install-task-assistant.sh <owner/repo> --dry-run


This will:

Verify repo access

Validate secrets (non-blocking)

Confirm required files are missing or outdated

Make zero changes

Actual Install
scripts/sandbox/install-task-assistant.sh <owner/repo>


Result:

Files are committed

Dispatcher becomes active

Repo is now “Task Assistant–enabled”

Step 5 — First-Time Self-Test (Automatic)

Once installed, Task Assistant will automatically run:

task-assistant-dispatch.yml → self-test mode


This validates:

Config schema

Label/milestone expectations

Telemetry routing

Engine execution context

Telemetry Output

Written to:

<owner>/task-assistant-telemetry/telemetry/v1/repos/<repo>/<date>.jsonl

Step 6 — Ongoing Operation (No User Action Required)

After onboarding, Task Assistant runs automatically:

Trigger	Behavior
Issue label change	Enforcement engine
Nightly schedule	Validation engine
Manual dispatch	Self-test / validate
Daily	Dashboard rebuild

No engines ever run in the host repo.

Security Guarantees

✔ Host repos cannot run arbitrary engine code
✔ App cannot cross org boundaries
✔ Telemetry is org-isolated
✔ Config is declarative and auditable
✔ Engines are centrally versioned

Uninstall / Disable

To disable Task Assistant in a repo:

Remove GitHub App from the repo or

Delete:

.github/task-assistant.yml

.github/workflows/task-assistant-dispatch.yml

No cleanup required in telemetry repo.

