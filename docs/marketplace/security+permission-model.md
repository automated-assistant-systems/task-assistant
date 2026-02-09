# Task Assistant — Security & Permission Model (Reviewer Summary)

## Overview

Task Assistant enforces strict, defense-in-depth controls over all repository mutations.
No action can mutate repository state unless both GitHub permissions and Task Assistant infra policy explicitly allow it.

This model is enforced uniformly across installation, configuration, enforcement, materialization, and validation workflows.

## Identity-Based Access Control

All mutation operations run under a real GitHub identity:
- Either the repository owner
- Or the installed GitHub App with explicit permissions

Task Assistant never escalates privileges and never performs mutations across org or owner boundaries.

If the active identity does not have permission to mutate a repository, the operation fails safely.

✔️ Verified across single-org and multi-org test matrices

## Infra-Governed Safety Boundaries

Task Assistant maintains an authoritative infra registry that classifies repositories by context and state.

Certain operations are explicitly sandbox-only, including:
- Repository resets
- Bulk label / milestone removal
- Validation matrix preparation

If a repository is not registered as a sandbox, these operations are blocked before any mutation occurs, even if the GitHub identity has write access.

✔️ Prevents accidental or malicious destructive actions on production repositories

## Mutation Guardrails (No Silent Changes)

Every mutation path (labels, milestones, issue enforcement, repo preparation):
- Requires explicit engine execution
- Emits immutable telemetry
- Is traceable by correlation ID
- Cannot be triggered implicitly or transitively

There are no background mutations, cron-based state changes, or hidden side effects.

## Event-Driven Enforcement Safety

Issue enforcement is:
- Event-driven only (label events)
- Deterministic and idempotent
- Scoped strictly to the repository where the event occurred

Cross-repository or cross-organization enforcement is not possible.

## Telemetry as an Audit Trail

All engines emit immutable, append-only telemetry records including:
- Identity context
- Target repository
- Action outcome
- Correlation ID

This provides a complete, reviewer-verifiable audit trail for every operation that affects repository state.

## Verified Scenarios

The following scenarios were explicitly tested and validated:
- ✅ Same-org mutation succeeds
- ✅ Cross-org mutation is blocked
- ✅ Sandbox-only actions cannot run on non-sandbox repos
- ✅ Enforcement respects repo ownership
- ✅ Operator scripts fail safely under insufficient permissions
- ✅ No privilege escalation paths exist

## Security Posture Summary

Task Assistant is secure by construction:
- Principle of least privilege
- Explicit identity boundaries
- Infra-controlled mutation scope
- No implicit trust
- No hidden mutation paths

Failures are intentional, safe, and auditable, not silent.
