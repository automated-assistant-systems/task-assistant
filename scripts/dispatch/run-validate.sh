#!/usr/bin/env bash
set -euo pipefail

: "${TARGET_REPO:?TARGET_REPO (owner/repo) is required}"

MODE="validate"

OWNER="${TARGET_REPO%%/*}"
REPO="${TARGET_REPO##*/}"

echo "🧪 Task Assistant — Run Validate Engine"
echo "Repo:           $TARGET_REPO"
echo "Mode:           $MODE"
echo

gh workflow run task-assistant-dispatch.yml \
  --repo "$TARGET_REPO" \
  -f mode="$MODE"

echo "✓ Dispatch triggered (validate)"
echo "ℹ️ This is execution, not install validation"
