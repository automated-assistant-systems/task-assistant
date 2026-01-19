#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Task Assistant — Marketplace Installer
# Modes:
#   default  → install config + dispatch
#   --dry-run → validate only (no writes)
# ============================================================

REPO=""
DRY_RUN="false"

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN="true"
      ;;
    *)
      REPO="$arg"
      ;;
  esac
done

if [[ -z "$REPO" ]]; then
  echo "Usage: scripts/sandbox/install-task-assistant.sh <owner/repo> [--dry-run]"
  exit 1
fi

for cmd in gh git rsync; do
  command -v "$cmd" >/dev/null || {
    echo "❌ Missing dependency: $cmd"
    exit 1
  }
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo
echo "📦 Task Assistant — Marketplace Install"
echo "Target repo:  $REPO"
echo "Mode:         $([[ "$DRY_RUN" == "true" ]] && echo "DRY-RUN" || echo "INSTALL")"
echo

# ------------------------------------------------------------
# Preconditions (Task Assistant integrity)
# ------------------------------------------------------------
[[ -f "$ROOT_DIR/.github/task-assistant.yml" ]] || {
  echo "❌ Missing .github/task-assistant.yml in Task Assistant repo"
  exit 1
}

[[ -f "$ROOT_DIR/.github/workflows/task-assistant-dispatch.yml" ]] || {
  echo "❌ Missing task-assistant-dispatch.yml in Task Assistant repo"
  exit 1
}

# ------------------------------------------------------------
# Auth check
# ------------------------------------------------------------
gh auth status >/dev/null 2>&1 || {
  echo "❌ gh is not authenticated. Run: gh auth login"
  exit 1
}

# ------------------------------------------------------------
# Repo access check
# ------------------------------------------------------------
if ! gh repo view "$REPO" >/dev/null 2>&1; then
  echo "❌ Cannot access repo: $REPO"
  exit 1
fi

echo "✓ Repo accessible"

# ------------------------------------------------------------
# Secrets validation (non-blocking)
# ------------------------------------------------------------
echo
echo "🔐 Checking required GitHub App secrets..."

MISSING_SECRETS=()

for secret in CODEX_APP_ID CODEX_PRIVATE_KEY; do
  if ! gh secret list --repo "$REPO" | awk '{print $1}' | grep -qx "$secret"; then
    MISSING_SECRETS+=("$secret")
  fi
done

if [[ ${#MISSING_SECRETS[@]} -gt 0 ]]; then
  echo "⚠️  Missing secrets:"
  for s in "${MISSING_SECRETS[@]}"; do
    echo "  - $s"
  done
  echo "→ Workflows will fail until secrets are added"
else
  echo "✓ Required secrets present"
fi

# ------------------------------------------------------------
# File presence check (remote)
# ------------------------------------------------------------
echo
echo "📂 Checking existing Task Assistant files in repo..."

HAS_CONFIG="$(gh api "repos/$REPO/contents/.github/task-assistant.yml" >/dev/null 2>&1 && echo yes || echo no)"
HAS_DISPATCH="$(gh api "repos/$REPO/contents/.github/workflows/task-assistant-dispatch.yml" >/dev/null 2>&1 && echo yes || echo no)"

echo "  .github/task-assistant.yml:            $HAS_CONFIG"
echo "  task-assistant-dispatch.yml:           $HAS_DISPATCH"

# ------------------------------------------------------------
# Dry-run exit
# ------------------------------------------------------------
if [[ "$DRY_RUN" == "true" ]]; then
  echo
  echo "🧪 Dry-run complete — no changes made"
  echo
  echo "Would install:"
  echo "  • .github/task-assistant.yml"
  echo "  • .github/workflows/task-assistant-dispatch.yml"
  echo
  exit 0
fi

# ------------------------------------------------------------
# Real install (clone + sync)
# ------------------------------------------------------------
WORKDIR="$(mktemp -d)"
TARGET_DIR="$WORKDIR/target"
trap 'rm -rf "$WORKDIR"' EXIT

echo
echo "→ Cloning target repo..."
gh repo clone "$REPO" "$TARGET_DIR" -- --quiet

mkdir -p "$TARGET_DIR/.github/workflows"

rsync -a \
  "$ROOT_DIR/.github/task-assistant.yml" \
  "$TARGET_DIR/.github/task-assistant.yml"

rsync -a \
  "$ROOT_DIR/.github/workflows/task-assistant-dispatch.yml" \
  "$TARGET_DIR/.github/workflows/task-assistant-dispatch.yml"

cd "$TARGET_DIR"

git add .github/task-assistant.yml .github/workflows/task-assistant-dispatch.yml

if git diff --cached --quiet; then
  echo "✓ Repo already up to date"
else
  git commit -m "chore: install Task Assistant (config + dispatch only)" >/dev/null
  git push >/dev/null
  echo "✓ Task Assistant installed into $REPO"
fi

echo
echo "✔ Install complete"
