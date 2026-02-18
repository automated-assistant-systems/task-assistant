Task Assistant GitHub App — Architecture
1. Purpose & Scope

Goal:
Make Task Assistant a GitHub-native automation layer that any repo can adopt via the GitHub Marketplace:

Install Task Assistant →

Repo gets state-machine-based workflows, telemetry, and dashboards →

Minimal configuration required.

Key idea:
The GitHub App is the identity + distribution channel, while the task-assistant-core GitHub Action + workflows do the heavy lifting inside each repository.

Future Codex SaaS can plug into this by consuming the same telemetry/webhooks, but is out of scope for Task Assistant 1.0.

2. High-Level Architecture
2.1 Main Components

Task Assistant GitHub App

Installed from GitHub Marketplace.

Grants Task Assistant access to Issues, Repo Contents, Metadata, Projects (optional), Actions (read).

Optionally receives webhooks (for future SaaS/telemetry service).

Repo-Level Workflows (Task Assistant Bundle)

Stored in .github/workflows/ in the user’s repo:

task-assistant-issue-events.yml

task-assistant-nightly-sweep.yml

task-assistant-dashboard-build.yml

task-assistant-self-test.yml

Trigger on issues events + schedule + workflow_dispatch.

Task Assistant Configuration

Stored in the repository as:

.github/task-assistant.yml


Defines tracks, stale rules, telemetry paths, self-healing options.

task-assistant-core GitHub Action

A separate action repo, e.g.:

task-assistant-core

Implements classification, milestone enforcement, and telemetry writing.

Called from the workflows with:

uses: task-assistant-core@v1

Telemetry + Dashboard Files

Stored in the user’s repo (no external DB in 1.0):

telemetry/
  events/
  sweeps/
  diagnostics.json

dashboard/
  dashboard.json
  index.html (optional for gh-pages or static hosting)


(Optional / Future) Task Assistant Backend

A minimal server that can:

Receive webhooks from the GitHub App.

Aggregate cross-repo telemetry (for Codex SaaS).

Serve org-level dashboards.

Not needed for Task Assistant 1.0.

3. Installation & Onboarding Flow
3.1 User Flow (from the developer’s POV)

User finds Automated Task Assistant on GitHub Marketplace.

Clicks Install → selects organization and repositories.

After installation, user is guided to:

Add Task Assistant configuration:

.github/task-assistant.yml

Add Task Assistant workflows:

Use repo template / manual copy / script.

User runs Self-Test workflow once to verify setup:

Task Assistant • Self-Test in Actions tab.

After that, Task Assistant runs continuously:

On each issue event.

Nightly sweeps.

Scheduled dashboard builds.

4. Permissions & Webhooks
4.1 GitHub App Permissions (Minimum for 1.0)

Repository Permissions

Issues: Read & write

Needed to label issues, set milestones.

Contents: Read & write

Needed for writing telemetry and dashboard files.

Metadata: Read

Needed for general repo info.

Pull Requests: Read (future use)

For PR-based workflows, comments, etc.

Actions: Read

For telemetry about workflow health (future).

Projects (classic or Projects): Read (optional for 1.0, useful later).

Organization Permissions (Optional / Later)
Only if you want org-level dashboards and settings.

4.2 Webhooks (Configured at App Level)

For Task Assistant 1.0 (no backend), webhooks can be minimal or even unused.

For future SaaS / Codex:

Subscribe to:

issues

issue_comment

milestone

repository

installation

installation_repositories

workflow_run

These webhooks will eventually feed a backend for:

Cross-repo telemetry

Usage tracking

Org analytics

Important:
For Task Assistant 1.0, all logic is inside repo workflows using GITHUB_TOKEN.
The App mainly exists for installation + branding + future expansion.

5. Execution Flows
5.1 Issue Event Flow (Core Task Assistant Behavior)

Trigger:
Developer opens/edits/labels an issue.

Flow:

GitHub emits issues event.

Workflow: .github/workflows/task-assistant-issue-events.yml runs:

Uses actions/checkout@v4.

Calls task-assistant-core@v1 with:

config-path: .github/task-assistant.yml

task-assistant-core:

Loads config.

Reads issue from event payload.

Classifies track (e.g., track/sprint).

If missing track and self_healing.fix_missing_track is true:

Adds appropriate track/* label.

If self_healing.fix_missing_milestone is true:

Infers desired milestone (e.g. Sprint 1.0).

Finds or creates milestone.

Attaches milestone to issue.

Writes telemetry:

telemetry/events/{issue}-{timestamp}.json.

Workflow (optional): commit telemetry files and push.

Outcome:

Every issue ends up:

correctly labeled by track

assigned to proper milestone

logged as a telemetry event.

5.2 Nightly Sweep Flow

Trigger:
task-assistant-nightly-sweep.yml via schedule or manual dispatch.

Flow:

Checkout repo.

Load .github/task-assistant.yml.

Sweep logic (via task-assistant-core or separate script):

For each open issue:

Determine last updated date.

Check stale thresholds from config.

Apply state/stale label if needed.

Close issue if beyond days_until_close.

Validate track + milestone rules.

Write sweep telemetry:

telemetry/sweeps/{date}.json.

Optionally trigger dashboard rebuild.

5.3 Dashboard Build Flow

Trigger:

task-assistant-dashboard-build.yml via schedule or manual.

Flow:

Checkout repo.

Aggregate telemetry files from:

telemetry/events/

telemetry/sweeps/

telemetry/diagnostics.json

Generate dashboard/dashboard.json (snapshots: counts, tracks, sprints, hygiene, automation health).

Commit & push dashboard/dashboard.json.

If using gh-pages, ensure dashboard/index.html reads that JSON.

5.4 Self-Test Flow

Trigger:
task-assistant-self-test.yml workflow_dispatch.

Flow:

Verify .github/task-assistant.yml exists and parses.

Confirm telemetry/ and dashboard/ directories exist or can be created.

Check required labels (e.g., track/sprint, state/stale).

Attempt to write telemetry/diagnostics.json.

Fail the workflow if essentials are missing.

6. Security & Identity Model
6.1 Action Execution Identity

In Task Assistant 1.0, the workflows use:

GITHUB_TOKEN (automatically provided per repo/workflow run).

This token respects the repo’s permissions and branch protections.

You do not need the App’s installation token in 1.0 for repo workflows — the App is primarily:

A distribution & branding mechanism.

A future anchor for SaaS / external telemetry consumers.

6.2 Future: App Installation Token

If/when you introduce Codex SaaS:

A backend service can use the GitHub App’s installation token to:

Read issues/milestones from multiple repos.

Generate org-level dashboards.

Enforce cross-repo rules.

7. Multi-Repo & Org-Level View (Future Codex SaaS)

Longer-term (beyond Task Assistant 1.0):

Each repo runs Task Assistant workflows and writes telemetry locally.

The GitHub App also sends events to a backend.

Backend aggregates:

Across repos

Across org

Over time

SaaS UI shows:

Org sprint velocity

Track health across teams

Automation failures

Standardized executive dashboards

But none of this is required for Task Assistant 1.0; the repo-local dashboard is enough to be valuable.

8. Architecture Summary (In One Paragraph)

Task Assistant GitHub App is the installable identity that connects to a repository. Inside that repository, a set of Task Assistant workflows call the task-assistant-core GitHub Action, which reads .github/task-assistant.yml, enforces consistent track/milestone rules, performs self-healing where allowed, and writes telemetry into telemetry/. A dashboard build workflow then aggregates this telemetry into dashboard/dashboard.json, which can power a GitHub Pages or static dashboard. The App’s webhooks and installation context become the foundation for a future Codex SaaS, but Task Assistant 1.0 runs fully within GitHub with no external infrastructure.

9. Practical Next Steps

Now that the architecture is defined, here’s what to do in what order:

Confirm repo split:

task-assistant (App + workflows + docs)

task-assistant-core (GitHub Action)

Create the Task Assistant GitHub App in GitHub:

Use a manifest based on the permissions above.

Set a placeholder webhook URL for now (or none).

Wire your workflows to use:

uses: task-assistant-core@v1


Finalize .github/task-assistant.yml schema and add a basic example.

Run the Self-Test workflow in your own repo to validate end-to-end.

Prepare Marketplace listing copy (short description, long description, screenshots).
