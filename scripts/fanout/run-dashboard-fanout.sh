#!/usr/bin/env bash
set -euo pipefail

REPO="automated-assistant-systems/task-assistant"

echo "📊 Task Assistant — Run Dashboard Fanout"
echo "Repo: $REPO"
echo

gh workflow run dashboard-fanout.yml \
  --repo "$REPO"

echo "✓ Dashboard fanout workflow triggered"
echo "ℹ️ Fanout logic executes inside GitHub Actions"
