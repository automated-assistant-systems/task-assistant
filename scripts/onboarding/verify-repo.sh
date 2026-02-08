#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Verify repository integrity after mutation
#
# This script is an operator convenience wrapper.
# It triggers authoritative engines via dispatch:
#   1. self-test
#   2. validate
#
# Engines generate correlation IDs internally.
# This script never invokes engines directly.
#
# Usage:
#   ./scripts/onboarding/verify-repo.sh <owner>/<repo>
#
# Example:
#   ./scripts/onboarding/verify-repo.sh automated-assistant-systems/task-assistant
# ─────────────────────────────────────────────

REPO="${1:-}"

if [[ -z "$REPO" ]]; then
  echo "Usage: verify-repo.sh <owner>/<repo>"
  exit 1
fi

node scripts/onboarding/verify-repo-hygiene.js "$REPO"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DISPATCH_DIR="$SCRIPT_DIR/../dispatch"

TA_DISPATCH="$DISPATCH_DIR/run-task-assistant.sh"

if [[ ! -x "$TA_DISPATCH" ]]; then
  echo "❌ Missing executable: $TA_DISPATCH"
  exit 1
fi

echo "🔍 Verifying repository integrity"
echo "• Repo: $REPO"
echo

echo "▶ Running self-test"
$TA_DISPATCH "$REPO" --self-test

echo
echo "▶ Running validate"
$TA_DISPATCH "$REPO" --validate

echo
echo "✔ Verification triggered"
echo "✔ Review telemetry to confirm successful completion"
