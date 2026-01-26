#!/usr/bin/env bash
set -euo pipefail

: "${TARGET_REPO:?TARGET_REPO (owner/repo) is required}"

MODE="self-test"

OWNER="${TARGET_REPO%%/*}"
REPO="${TARGET_REPO##*/}"

echo "🚀 Task Assistant — Run Self-Test"
echo "Repo:           $TARGET_REPO"
echo "Mode:           $MODE"
echo

gh workflow run task-assistant-dispatch.yml \
  --repo "$TARGET_REPO" \
  -f mode="$MODE"

echo "✓ Dispatch triggered"
echo "ℹ️ Monitor progress via GitHub Actions UI"
