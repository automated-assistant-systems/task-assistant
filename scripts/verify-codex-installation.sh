#!/usr/bin/env bash
set -euo pipefail

ORG="${1:-}"
if [[ -z "$ORG" ]]; then
  echo "Usage: verify-codex-installation.sh <github-org>"
  exit 1
fi

echo "🔎 Verifying Codex installation for org: $ORG"

INSTALLATIONS=$(gh api /orgs/$ORG/installations --jq '.installations[].app_slug')

if echo "$INSTALLATIONS" | grep -q codex; then
  echo "✅ Codex is installed on $ORG"
else
  echo "❌ Codex is NOT installed on $ORG"
  exit 1
fi
