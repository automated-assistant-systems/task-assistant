# Task Assistant — Marketplace Overview

Task Assistant is a GitHub App that enforces repository hygiene using explicit, configuration-driven rules and emits structured telemetry for auditability and operator visibility.

Repository mutations (such as label and milestone creation) are performed only when explicitly requested via a manual “materialize” action. Task Assistant never performs speculative or automatic repository mutations.

The system is designed to be:
- Deterministic
- Non-destructive by default
- Fully auditable
- Safe for GitHub Marketplace distribution

Task Assistant separates:
- Enforcement behavior (monitored repositories)
- Telemetry storage (dedicated telemetry repository)
- Observability (derived, read-only dashboards)

This document set describes what runs automatically, what permissions are required, and what the app explicitly does not do.
