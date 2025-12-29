#!/usr/bin/env bash
set -euo pipefail

REPO="automated-assistant-systems/task-assistant"

echo "Creating Phase 3 issues in $REPO"

# ──────────────────────────────
# Phase 3.1 – Telemetry Enhancements
# ──────────────────────────────
gh issue create --repo "$REPO" \
  --title "Enhance telemetry schema for milestone enforcement" \
  --body "Extend telemetry to capture milestone enforcement decisions, failures, and recovery actions." \
  --label "track/ops,priority/high" \
  --milestone "Phase 3.1 – Telemetry Enhancements"

gh issue create --repo "$REPO" \
  --title "Persist validation evidence across workflow boundaries" \
  --body "Ensure validation evidence survives across issue-events, nightly sweep, and self-test workflows." \
  --label "track/ops,priority/high" \
  --milestone "Phase 3.1 – Telemetry Enhancements"

gh issue create --repo "$REPO" \
  --title "Expose telemetry summary for repo-level diagnostics" \
  --body "Provide a summarized telemetry view usable for diagnostics, dashboards, and Marketplace readiness checks." \
  --label "track/ops,priority/medium" \
  --milestone "Phase 3.1 – Telemetry Enhancements"

# ──────────────────────────────
# Phase 3.2 – Hygiene & Enforcement
# ──────────────────────────────
gh issue create --repo "$REPO" \
  --title "Enforce single-track label hygiene" \
  --body "Automatically normalize conflicting track labels to a single authoritative track." \
  --label "track/support,priority/high" \
  --milestone "Phase 3.2 – Hygiene & Enforcement"

gh issue create --repo "$REPO" \
  --title "Guarantee milestone enforcement on milestone-enabled tracks" \
  --body "Ensure that tracks with default_milestone_pattern always apply a milestone on issue creation and mutation." \
  --label "track/sprint,priority/high" \
  --milestone "Phase 3.2 – Hygiene & Enforcement"

gh issue create --repo "$REPO" \
  --title "Define deterministic behavior for track switching" \
  --body "Specify and enforce rules when issues move between milestone and non-milestone tracks." \
  --label "track/support,priority/medium" \
  --milestone "Phase 3.2 – Hygiene & Enforcement"

# ──────────────────────────────
# Phase 3.3 – UX & Config Experience
# ──────────────────────────────
gh issue create --repo "$REPO" \
  --title "Improve task-assistant.yml validation and error messaging" \
  --body "Provide clearer validation errors and actionable guidance for repo configuration mistakes." \
  --label "track/backlog,priority/medium" \
  --milestone "Phase 3.3 – UX & Config Experience"

gh issue create --repo "$REPO" \
  --title "Document recommended repo onboarding flow" \
  --body "Define the recommended sequence: config → prep → issue creation → validation." \
  --label "track/backlog,priority/low" \
  --milestone "Phase 3.3 – UX & Config Experience"

# ──────────────────────────────
# Phase 3.4 – Marketplace Readiness
# ──────────────────────────────
gh issue create --repo "$REPO" \
  --title "Finalize Marketplace-safe defaults and permissions" \
  --body "Audit defaults, permissions, and failure modes for GitHub Marketplace compliance." \
  --label "track/ops,priority/high" \
  --milestone "Phase 3.4 – Marketplace Readiness"

gh issue create --repo "$REPO" \
  --title "Harden workflows against partial configuration states" \
  --body "Ensure workflows fail safely when repos are partially configured or mid-onboarding." \
  --label "track/ops,priority/medium" \
  --milestone "Phase 3.4 – Marketplace Readiness"

# ──────────────────────────────
# Phase 3.5 – Post-Release Hardening
# ──────────────────────────────
gh issue create --repo "$REPO" \
  --title "Add lightweight observability for workflow execution" \
  --body "Introduce minimal observability hooks without full stress testing." \
  --label "track/ops,priority/medium" \
  --milestone "Phase 3.5 – Post-Release Hardening"

gh issue create --repo "$REPO" \
  --title "Capture edge-case failures discovered in live repos" \
  --body "Track and remediate edge cases discovered post-release." \
  --label "track/support,priority/low" \
  --milestone "Phase 3.5 – Post-Release Hardening"

echo "Phase 3 issue creation complete."
