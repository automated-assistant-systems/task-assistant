#!/usr/bin/env bash
set -euo pipefail

REPO="$1"

if [[ -z "$REPO" ]]; then
  echo "Usage: install-task-assistant.sh <owner/repo>"
  exit 1
fi

echo "🧪 Validating repo (dry-run)"
node scripts/prepare-repo.js "$REPO" --dry-run --json | jq .

echo
echo "🚀 Applying Task Assistant preparation"
node scripts/prepare-repo.js "$REPO" --json | jq .

echo "✅ Task Assistant installed and prepared"
