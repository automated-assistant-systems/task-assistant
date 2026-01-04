#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null; then
  echo "❌ GitHub CLI (gh) is required"
  exit 1
fi

if ! command -v jq >/dev/null; then
  echo "❌ jq is required"
  exit 1
fi

ORG="${1:-}"
if [[ -z "$ORG" ]]; then
  echo "Usage: bootstrap-codex-app-secrets.sh <github-org>"
  exit 1
fi

echo "🔐 Bootstrapping Codex GitHub App secrets for org: $ORG"

echo "➡️ Enter Codex App ID (from GitHub App settings):"
read -r CODEX_APP_ID

if [[ -z "$CODEX_APP_ID" ]]; then
  echo "❌ App ID required"
  exit 1
fi

echo "➡️ Path to Codex private key (.pem):"
read -r PEM_PATH

if [[ ! -f "$PEM_PATH" ]]; then
  echo "❌ PEM file not found: $PEM_PATH"
  exit 1
fi

echo "🔑 Storing CODEX_APP_ID secret"
gh secret set CODEX_APP_ID \
  --org "$ORG" \
  --visibility all \
  --body "$CODEX_APP_ID"

echo "🔑 Storing CODEX_PRIVATE_KEY secret"
gh secret set CODEX_PRIVATE_KEY \
  --org "$ORG" \
  --visibility all \
  --body "$(cat "$PEM_PATH")"

echo "✅ Secrets created successfully"

echo "🔍 Verifying secrets"
gh secret list --org "$ORG" | grep -E "CODEX_APP_ID|CODEX_PRIVATE_KEY"

echo "🎉 Codex App secrets bootstrap complete"
