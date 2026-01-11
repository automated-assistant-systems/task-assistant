#!/usr/bin/env bash
set -euo pipefail

REPO="automated-assistant-systems/task-assistant-sandbox"
TMP_DIR="/tmp/ta-recover"
CONFIG_PATH=".github/task-assistant.yml"

echo "🛠️  Sandbox Recovery — Task Assistant"
echo "Repo: $REPO"
echo

rm -rf "$TMP_DIR"
gh repo clone "$REPO" "$TMP_DIR" >/dev/null

cd "$TMP_DIR"

echo "→ Locating last known good config commit..."

GOOD_COMMIT=$(git log --pretty=oneline -- "$CONFIG_PATH" | grep -v "test invalid config" | head -n 1 | awk '{print $1}')

if [[ -z "$GOOD_COMMIT" ]]; then
  echo "❌ Unable to locate valid config commit"
  exit 1
fi

echo "✓ Found good config commit: $GOOD_COMMIT"

git checkout "$GOOD_COMMIT" -- "$CONFIG_PATH"

git commit -m "restore valid task-assistant.yml after validation tests" >/dev/null
git push >/dev/null

echo "✅ Sandbox config restored successfully"
