#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Task Assistant — Marketplace Installer (Phase 3.4)
#
# Installs ONLY:
#   • .github/task-assistant.yml
#   • .github/workflows/task-assistant-dispatch.yml
#
# Infra detection:
#   • v2 registry (preferred)
#   • v1 registry (legacy fallback)
#
# Modes:
#   default  → install
#   --dry-run → validate only
# ============================================================

REPO=""
DRY_RUN="false"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN="true" ;;
    *) REPO="$arg" ;;
  esac
done

if [[ -z "$REPO" ]]; then
  echo "Usage: scripts/sandbox/install-task-assistant.sh <owner/repo> [--dry-run]"
  exit 1
fi

for cmd in gh git rsync jq base64 sha256sum; do
  command -v "$cmd" >/dev/null || {
    echo "❌ Missing dependency: $cmd"
    exit 1
  }
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OWNER="${REPO%%/*}"
REPO_NAME="${REPO##*/}"

echo
echo "📦 Task Assistant — Marketplace Install (Phase 3.4)"
echo "Target repo:  $REPO"
echo "Mode:         $([[ "$DRY_RUN" == "true" ]] && echo "DRY-RUN" || echo "INSTALL")"
echo

# ------------------------------------------------------------
# Task Assistant source integrity
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
# Auth + repo access
# ------------------------------------------------------------
gh auth status >/dev/null 2>&1 || {
  echo "❌ gh is not authenticated. Run: gh auth login"
  exit 1
}

if ! gh repo view "$REPO" >/dev/null 2>&1; then
  echo "❌ Cannot access repo: $REPO"
  exit 1
fi

echo "✓ Repo accessible"

# ------------------------------------------------------------
# Infra detection (v2 first, v1 fallback)
# ------------------------------------------------------------
echo
echo "🔎 Detecting infra registration…"

INFRA_VERSION="none"

# ---- v2 registry ----
if gh api repos/automated-assistant-systems/task-assistant-infra/contents/infra/telemetry-registry.v2.json \
  --jq '.content' 2>/dev/null \
  | base64 --decode \
  | jq -e \
      --arg owner "$OWNER" \
      --arg repo "$REPO_NAME" '
        .orgs[$owner].repos[$repo].state == "enabled"
      ' >/dev/null 2>&1; then
  INFRA_VERSION="v2"
fi

# ---- v1 registry fallback ----
if [[ "$INFRA_VERSION" == "none" ]]; then
  if gh api repos/automated-assistant-systems/task-assistant-infra/contents/telemetry-registry.json \
    --jq '.content' 2>/dev/null \
    | base64 --decode \
    | jq -e \
        --arg owner "$OWNER" \
        --arg repo "$REPO_NAME" '
          .organizations[]
          | select(.owner == $owner)
          | .repositories[]
          | select(.name == $repo and .enabled == true)
        ' >/dev/null 2>&1; then
    INFRA_VERSION="v1"
  fi
fi

case "$INFRA_VERSION" in
  v2)
    echo "✓ Repo is registered in infra v2 (preferred)"
    ;;
  v1)
    echo "⚠️  Repo is registered in infra v1 (legacy fallback)"
    echo "   v2 registration recommended before Marketplace release"
    ;;
  none)
    echo "⚠️  Repo is not registered in infra (v1 or v2)"
    echo "   Preflight and telemetry will fail until registered"
    ;;
esac

# ------------------------------------------------------------
# Secrets check (repo OR org)
# ------------------------------------------------------------
echo
echo "🔐 Checking GitHub App secrets (repo or org)…"

missing=()

for secret in CODEX_APP_ID CODEX_PRIVATE_KEY; do
  if gh secret list --repo "$REPO" | awk '{print $1}' | grep -qx "$secret"; then
    continue
  fi

  if gh secret list --org "$OWNER" | awk '{print $1}' | grep -qx "$secret"; then
    continue
  fi

  missing+=("$secret")
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "⚠️  Missing secrets:"
  for s in "${missing[@]}"; do
    echo "  - $s"
  done
  echo "→ Preflight engine will fail until secrets are added"
else
  echo "✓ Required secrets visible"
fi

# ------------------------------------------------------------
# Dispatch currency check
# ------------------------------------------------------------
echo
echo "🧪 Verifying dispatch currency…"

CANONICAL_HASH="$(sha256sum "$ROOT_DIR/.github/workflows/task-assistant-dispatch.yml" | awk '{print $1}')"

REMOTE_CONTENT="$(
  gh api "repos/$REPO/contents/.github/workflows/task-assistant-dispatch.yml" \
    --jq '.content' 2>/dev/null || true
)"

if [[ -z "$REMOTE_CONTENT" ]]; then
  DISPATCH_STATUS="missing"
else
  REMOTE_HASH="$(
    printf '%s' "$REMOTE_CONTENT" \
    | base64 --decode \
    | sha256sum \
    | awk '{print $1}'
  )"

  if [[ "$REMOTE_HASH" == "$CANONICAL_HASH" ]]; then
    DISPATCH_STATUS="up-to-date"
  else
    DISPATCH_STATUS="out-of-date"
  fi
fi

echo "  Dispatch status: $DISPATCH_STATUS"

# ------------------------------------------------------------
# Dry-run exit
# ------------------------------------------------------------
if [[ "$DRY_RUN" == "true" ]]; then
  echo
  echo "🧪 Dry-run complete — no changes made"
  echo
  echo "Would install / update:"
  echo "  • .github/task-assistant.yml"
  if [[ "$DISPATCH_STATUS" != "up-to-date" ]]; then
    echo "  • .github/workflows/task-assistant-dispatch.yml (update required)"
  else
    echo "  • .github/workflows/task-assistant-dispatch.yml (already current)"
  fi
  echo
  exit 0
fi

# ------------------------------------------------------------
# Real install
# ------------------------------------------------------------
WORKDIR="$(mktemp -d)"
TARGET_DIR="$WORKDIR/target"
trap 'rm -rf "$WORKDIR"' EXIT

echo
echo "→ Cloning target repo…"
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
  git commit -m "chore: install Task Assistant (config + dispatch)" >/dev/null
  git push >/dev/null
  echo "✓ Task Assistant installed into $REPO"
fi

echo
echo "✔ Install complete"
echo "⚠️ Repo preparation \(labels & milestones\) is required before workflows will fully pass."
echo
