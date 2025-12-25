# Task Assistant  
### GitHub App · Automated Workflows · Repo Hygiene · Dashboards

Task Assistant (formerly Mindforge Orchestrator) is a GitHub App that automates repository hygiene, sprint consistency,  
and issue lifecycle management using a rules-based workflow engine.

It applies **track labels**, enforces **milestones**, generates **telemetry**, and produces  
a real-time **dashboard.json** inside your repository — with zero external dependencies.

Task Assistant gives your team clarity, consistency, and visibility across your development workflow.

---

# ✨ Features

### 🚦 Automated Workflow Enforcement
- Assigns `track/*` labels based on rules  
- Ensures issues belong to correct milestones  
- Applies stale markers and closes abandoned issues  
- Heals incorrect or missing labels  

### 📊 Real-Time Repository Dashboard
Builds a live `dashboard/dashboard.json` summarizing:
- Open issues by track  
- Milestone progress  
- Stale issues  
- Telemetry events  
- Sweep statistics  
- Automation diagnostics  

### 📈 Telemetry System
Each workflow run emits structured JSON:
telemetry/events/
telemetry/diagnostics.json
telemetry/sweeps/

These files form the foundation for:
- Local dashboards
- Cross-repo analytics
- Future MindForge SaaS insights

### 🔧 Zero External Services
Everything runs inside your repository via:
- GitHub Actions
- `GITHUB_TOKEN`
- Local JSON files

No cloud backend is required.

---

# 🛠 Installation

1. Install the **Task Assistant GitHub App** (coming soon).  
2. Create the configuration file:

.github/orchestrator.yml

yaml
Copy code

Example:

```yaml
tracks:
  sprint:
    match: ["feature", "enhancement"]
  backlog:
    match: ["idea"]
  bug:
    match: ["bug"]

self_healing:
  fix_missing_track: true
  fix_missing_milestone: true
  fix_stale: true

stale:
  days_until_stale: 14
  days_until_close: 7

Add the Task Assistant workflows:
.github/workflows/
  orchestrator-issue-events.yml
  orchestrator-nightly-sweep.yml
  orchestrator-dashboard-build.yml
  orchestrator-self-test.yml

Run the Self-Test workflow:

GitHub Actions → Task Assistant • Self Test

This validates labels, telemetry directories, config parsing, and permissions.

🚀 How It Works (Architecture)
┌──────────────────────────┐
│       Task Assistant     │  (GitHub App)
└──────────────┬───────────┘
               │ Installs
               ▼
┌──────────────────────────────────────────┐
│ Repo Workflows (.github/workflows/*.yml) │
│ - issue events                           │
│ - nightly sweeps                         │
│ - dashboard builds                       │
│ - self tests                             │
└──────────────┬───────────────────────────┘
               │ calls
               ▼
┌──────────────────────────────────────────┐
│   orchestrator-core (GitHub Action)      │
│   https://github.com/garybayes/mindforge │
│   - classification                       │
│   - milestone logic                      │
│   - stale handling                       │
│   - telemetry writing                    │
└──────────────┬───────────────────────────┘
               │ writes
               ▼
┌──────────────────────────────────────────┐
│ Repo Telemetry / Dashboard               │
│ dashboard/dashboard.json                 │
│ telemetry/events/*.json                  │
│ telemetry/diagnostics.json               │
│ telemetry/sweeps/*.json                  │
└──────────────────────────────────────────┘
This architecture keeps everything inside GitHub, fully portable and team-friendly.

📁 Repository Structure
Copy code
.github/
  orchestrator.yml
  workflows/
dashboard/
telemetry/
docs/
scripts/

📊 Dashboard
Generated at:
dashboard/dashboard.json

Can be read by:

GitHub Pages

Static dashboard viewers

Third-party tools

Future MindForge SaaS

🔗 Related Repository
This project relies on:

Task Assistant Core (GitHub Action)
https://github.com/garybayes/mindforge-orchestrator-core

Add the Action to your workflows using:
uses: garybayes/mindforge-orchestrator-core@v1

🧪 Self-Test Workflow
Task Assistant includes a self-diagnostic workflow that checks:

Repo permissions

Required labels

Ability to write telemetry

Config validity

Workflow health

Run before onboarding a team or starting a sprint.

📝 Documentation
See the /docs folder for:

Task Assistant Technical Design

Feature Roadmap

SaaS Expansion Strategy

Developer Telemetry Model

Dashboard Specification

🐛 Issues & Support
If you encounter problems:

Run the Self-Test workflow

Check telemetry/diagnostics.json

Open an issue on GitHub

📄 License
MIT License.

## NON-GOALS
* Core does not run itself
* Installing core ≠ installing App
* App owns auth, core owns logic

## NOTES
✅ GitHub App installed, webhook verified, issue automation live.
