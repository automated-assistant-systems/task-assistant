# Task Assistant for GitHub — GitHub App Onboarding Flow (Authoritative)

This document explains how to install and use Task Assistant in a repository.

It is intentionally explicit and boring.
Experienced users can skim headings.
New users can follow it step by step.

Nothing in this process requires running scripts locally.

---

## What Task Assistant for GitHub Is (Mental Model)

Task Assistant for GitHub is a **GitHub App**, not a library or framework.

After installation:

- Your repository contains **only configuration and a dispatcher**
- No engine code is copied into your repository
- All automation runs from the Task Assistant App
- Telemetry is written to a **separate telemetry repository**

### Your Repository (Host Repo)

.github/
├─ task-assistant.yml
└─ workflows/
└─ task-assistant-dispatch.yml

That’s it.

### Task Assistant for GitHub App Repository

- Validation engines
- Enforcement engines
- Telemetry and dashboard engines

### Telemetry Repository (Per Org)

telemetry/v1/
└─ repos/<owner-repo>/<yyyy-mm-dd>/<correlation_id>/*.jsonl

---

## Prerequisites

Before starting, you must have:

- Admin access to the repository
- Permission to install GitHub Apps
- Permission to create or choose a telemetry repository

No local tooling is required.

---

## Step 1 — Install the GitHub App

Actor: Repository Admin or Organization Owner  
UI: GitHub Marketplace

1. Go to the GitHub Marketplace
2. Find **Task Assistant for GitHub**
3. Click **Install**
4. Choose:
   - Entire organization **or**
   - Selected repositories
5. Review and approve permissions

### Permissions (Summary)

- Repository metadata (read)
- Issues (read/write — only if enforcement is configured)
- Contents (read)
- Contents (write — telemetry repository only)

🔒 Task Assistant cannot access repositories you do not approve.

---

## Step 2 — Create the Telemetry Repository (Once per Org)

Task Assistant requires a repository to store telemetry.

**Required name:**

<owner>/task-assistant-telemetry


This repository:

- Stores immutable telemetry (JSONL)
- Stores derived dashboards
- Is never written into monitored repositories

Recommended settings:

- Visibility: Private
- Default branch: main

This step is done once per organization.

---

## Step 3 — Add Required Secrets

Task Assistant authenticates using a GitHub App identity.

Two secrets must be available to the repository:

| Secret Name         | Value                         |
|---------------------|-------------------------------|
| `CODEX_APP_ID`      | GitHub App ID                 |
| `CODEX_PRIVATE_KEY` | GitHub App private key (.pem) |

These can be added as:

- Repository secrets, or
- Organization secrets (recommended for multiple repos)

Secrets are managed using the GitHub UI.

No Personal Access Tokens (PATs) are used.

---

## Step 4 — Add Task Assistant Files to the Repository

Task Assistant requires **two files** to exist in the repository.

### Required Files

.github/task-assistant.yml
.github/workflows/task-assistant-dispatch.yml


### What These Files Are

- `task-assistant.yml`  
  Declarative configuration only  
  Defines labels, milestones, and enforcement rules
  See docs/marketplace/config-reference.md for configuration information

- `task-assistant-dispatch.yml`  
  Dispatcher workflow only  
  Routes events to Task Assistant engines

### How to Add Them

1. Create the files in your repository
2. Commit and push them to the default branch

No scripts are required.
No engine code is copied.

---

### Configuration Evolution (Recommended Reading)

Task Assistant configurations are designed to evolve safely over time.

If this is your first install, start with the minimal configuration and
add enforcement rules gradually.

📘 **Config Evolution Guide**  
docs/config/config-evolution.md

This guide shows:
- A zero-risk starting config
- How to introduce enforcement safely
- How to evolve from simple → advanced rules
- How to roll back cleanly if needed

You do **not** need to enable enforcement to use Task Assistant.

---

## Step 5 — Register the repository (operator step)

Before Task Assistant can validate configuration or emit telemetry, the repository must be registered by the Task Assistant operator.

Registration:

- Associates the repository with its telemetry destination

- Enables preflight resolution

- Is required for all enforcement and validation behavior

How registration happens:

- The repository owner submits a registration request (documented in the Marketplace listing)

- The operator approves and registers the repository

- No automation runs until registration is complete

If the repository is not registered:

- Preflight fails

- Validation does not run

- No repository mutations occur

This is expected and safe behavior.

---

## Step 6 — Automatic Validation on Config Changes

After registration, whenever `.github/task-assistant.yml` is committed:
- Task Assistant automatically runs validation
- Configuration errors are reported in GitHub Actions
- No repository mutations occur

If validation fails:
- Enforcement does not run
- Nothing is modified

This is safe to repeat as often as needed.

---

## Step 7 — Materialize Labels & Milestones (Manual, Optional)

Task Assistant does **not** automatically create labels or milestones.

When you want them created:

1. Go to **Actions → Task Assistant • Dispatch**
2. Click **Run workflow**
3. Select mode: **materialize**
4. Run the workflow

What this does:

- Reads your configuration
- Creates missing labels and milestones
- Emits telemetry describing what changed

What this does **not** do:

- Modify code
- Create pull requests
- Perform speculative actions

This step can be re-run safely at any time.

---

## Step 8 — First-Time Self-Test (Optional)

To verify everything is wired correctly:

1. Go to **Actions → Task Assistant • Dispatch**
2. Run with mode: **self-test**

This validates:

- Configuration
- Telemetry routing
- Engine execution context
- Dashboard generation

Telemetry is written to the telemetry repository.

---

## Step 8 — Ongoing Operation

After onboarding, Task Assistant runs automatically:

| Trigger            | Behavior                           |
|--------------------|------------------------------------|
| Config push        | Validation                         |
| Issue label change | Enforcement (if configured)        |
| Nightly schedule   | Validation                         |
| Manual dispatch    | Self-test / validate / materialize |
| Scheduled          | Dashboard rebuild                  |

No user action is required for normal operation.

---

## Disabling or Uninstalling

To disable Task Assistant for a repository:

- Remove the GitHub App from the repo  
  **or**
- Delete:
.github/task-assistant.yml
.github/workflows/task-assistant-dispatch.yml


No cleanup is required in the telemetry repository.

---

## Security Guarantees

✔ No engine code runs in your repository  
✔ No scripts must be executed locally  
✔ No code is modified  
✔ No cross-org access  
✔ All behavior is deterministic and auditable  
✔ All failures are contained and visible via Actions logs  

---

## Summary

Installing Task Assistant consists of:

1. Installing the GitHub App
2. Creating a telemetry repository
3. Adding configuration and dispatcher files
4. Optionally materializing labels and milestones

Everything else is automated, explicit, and safe.
