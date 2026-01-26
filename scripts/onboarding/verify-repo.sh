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
#   ./scripts/onboarding/verify-repo.sh <repo>
#
# Example:
#   ./scripts/onboarding/verify-repo.sh task-assistant
# ─────────────────────────────────────────────

REPO="${1:-}"

if [[ -z "$REPO" ]]; then
  echo "Usage: verify-repo.sh <repo>"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DISPATCH_DIR="$SCRIPT_DIR/../dispatch"

SELF_TEST="$DISPATCH_DIR/run-self-test.sh"
VALIDATE="$DISPATCH_DIR/run-validate.sh"

if [[ ! -x "$SELF_TEST" ]]; then
  echo "❌ Missing executable: $SELF_TEST"
  exit 1
fi

if [[ ! -x "$VALIDATE" ]]; then
  echo "❌ Missing executable: $VALIDATE"
  exit 1
fi

echo "🔍 Verifying repository integrity"
echo "• Repo: $REPO"
echo

echo "▶ Running self-test"
"$SELF_TEST" "$REPO"

echo
echo "▶ Running validate"
"$VALIDATE" "$REPO"

echo
echo "✔ Verification triggered"
echo "✔ Review telemetry to confirm successful completion"
