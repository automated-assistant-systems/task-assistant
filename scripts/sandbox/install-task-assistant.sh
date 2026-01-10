#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-}"

if [[ -z "$REPO" ]]; then
  echo "Usage: scripts/sandbox/install-task-assistant.sh <owner/repo>"
  exit 1
fi

command -v gh >/dev/null || { echo "Missing dependency: gh"; exit 1; }
command -v git >/dev/null || { echo "Missing dependency: git"; exit 1; }
command -v rsync >/dev/null || { echo "Missing dependency: rsync"; exit 1; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKDIR="$(mktemp -d)"
TARGET_DIR="$WORKDIR/sandbox"

cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

echo "📦 Installing Task Assistant into sandbox"
echo "From: $ROOT_DIR"
echo "To repo: $REPO"
echo

# Preconditions
[[ -d "$ROOT_DIR/.github/workflows" ]] || { echo "❌ Missing .github/workflows in Task Assistant repo"; exit 1; }
[[ -f "$ROOT_DIR/.github/task-assistant.yml" ]] || { echo "❌ Missing .github/task-assistant.yml in Task Assistant repo"; exit 1; }
[[ -d "$ROOT_DIR/scripts" ]] || { echo "❌ Missing scripts/ in Task Assistant repo"; exit 1; }

gh auth status >/dev/null 2>&1 || {
  echo "❌ gh is not authenticated. Run: gh auth login"
  exit 1
}

echo "→ Cloning sandbox..."
gh repo clone "$REPO" "$TARGET_DIR" -- --quiet

echo "🔐 Checking required GitHub App secrets..."

MISSING_SECRETS=()

for secret in CODEX_APP_ID CODEX_PRIVATE_KEY; do
  if ! gh secret list --repo "$REPO" | awk '{print $1}' | grep -qx "$secret"; then
    MISSING_SECRETS+=("$secret")
  fi
done

if [[ ${#MISSING_SECRETS[@]} -gt 0 ]]; then
  echo "⚠️  WARNING: Task Assistant installed WITHOUT required secrets"
  echo
  echo "Missing secrets:"
  for s in "${MISSING_SECRETS[@]}"; do
    echo "  - $s"
  done
  echo
  echo "Result:"
  echo "  • Workflows WILL fail until secrets are added"
  echo "  • This is expected for fresh installs"
  echo
  echo "Next step:"
  echo "  gh secret set CODEX_APP_ID --repo $REPO --body <app-id>"
  echo "  gh secret set CODEX_PRIVATE_KEY --repo $REPO --body-file <key.pem>"
  echo
  INSTALL_STATUS="incomplete"
else
  echo "✓ Required secrets present"
  INSTALL_STATUS="complete"
fi

echo

rsync -a "$ROOT_DIR/package.json" "$TARGET_DIR/package.json"
rsync -a "$ROOT_DIR/package-lock.json" "$TARGET_DIR/package-lock.json"

# Ensure directories exist
mkdir -p "$TARGET_DIR/.github/workflows"
mkdir -p "$TARGET_DIR/scripts"

echo "→ Sync workflows (task-assistant-*.yml)..."
rsync -a --delete \
  "$ROOT_DIR/.github/workflows/" \
  "$TARGET_DIR/.github/workflows/"

# Optional: if you only want TA workflows, replace the above with:
# rsync -a --delete \
#   --include='task-assistant-*.yml' --exclude='*' \
#   "$ROOT_DIR/.github/workflows/" \
#   "$TARGET_DIR/.github/workflows/"

echo "→ Sync scripts/ (runtime + telemetry)..."
rsync -a --delete \
  "$ROOT_DIR/scripts/" \
  "$TARGET_DIR/scripts/"

echo "→ Sync config contract (.github/task-assistant.yml)..."
rsync -a \
  "$ROOT_DIR/.github/task-assistant.yml" \
  "$TARGET_DIR/.github/task-assistant.yml"

echo "→ Committing + pushing to sandbox..."
cd "$TARGET_DIR"

git add .github/workflows .github/task-assistant.yml scripts package.json package-lock.json

if [[ "$INSTALL_STATUS" == "incomplete" ]]; then
  INSTALL_NOTE=" (secrets missing)"
else
  INSTALL_NOTE=""
fi

if git diff --cached --quiet; then
  echo "✓ No changes to install (sandbox already matches Task Assistant)"
else
  git commit -m "chore: install task assistant (workflows+scripts+config)" >/dev/null
  git push >/dev/null
  echo "✓ Installed latest Task Assistant into $REPO"
fi

echo
echo "✔ Install complete"

