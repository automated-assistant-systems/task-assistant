Task Assistant — One-Page Marketplace Reviewer Summary
What This App Does

Task Assistant is a GitHub App that enforces repository hygiene using explicit, configuration-driven rules and emits immutable telemetry for auditability and operator visibility.

The system is intentionally conservative:

No speculative behavior

No hidden automation

No destructive actions without explicit configuration

Core Design Principles

Deterministic — same inputs produce the same outcomes

Non-destructive by default — enforcement actions require explicit configuration

Auditable — all automated behavior is recorded as immutable telemetry

Marketplace-safe — strict separation between enforcement, telemetry, and observability

What Runs Automatically

Task Assistant executes only three runtime components:

Repository Preparation Engine

Validates configuration and repository hygiene

Supports dry-run execution

Does not modify code or content

Enforcement Event Processor

Responds to GitHub events (e.g., issue updates)

Applies only explicitly configured actions

Performs no speculative or self-healing mutations

Telemetry Emission Engine

Emits structured, append-only telemetry

Records what happened, when, and why

Does not influence enforcement decisions

No other scripts or tools execute automatically.

Telemetry & Dashboards
Telemetry

Written to a dedicated, operator-owned telemetry repository

Stored as append-only, immutable JSONL

Never modified after creation

Never written to monitored repositories

Dashboards

Derived artifacts, not authoritative data

Generated from raw telemetry by a scheduled workflow

Written only to the telemetry repository

Never written to monitored repositories

Fully regenerable and deterministic

Dashboards have no effect on enforcement behavior.

Authentication & Permissions

All automation uses a GitHub App installation token

No Personal Access Tokens (PATs)

No user credentials

Permissions follow least-privilege principles

Writes are restricted to:

Telemetry repository (telemetry + dashboards only)

Task Assistant does not:

Modify repository code

Create pull requests

Delete issues, PRs, or branches

Failure & Safety Behavior

Missing configuration: enforcement does not run

Empty telemetry: dashboard generation exits cleanly

Malformed telemetry: dashboards report error state without mutation

Workflow failures: visible only via GitHub Actions logs

Failures never:

Propagate to monitored repositories

Trigger enforcement changes

Generate user-facing noise

Explicit Non-Behaviors

For clarity, Task Assistant does not:

Modify source code

Create or modify pull requests

Perform self-healing or speculative actions

Aggregate data across organizations

Write dashboards into user repositories

Require users to run scripts manually

Embed UI elements inside repositories

Summary Statement (Reviewer-Facing)

Task Assistant enforces repository hygiene using explicit configuration and emits immutable telemetry to a dedicated repository. Derived dashboards are generated separately as read-only artifacts and never modify monitored repositories. All behavior is deterministic, auditable, and designed to meet GitHub Marketplace safety standards.
