#!/usr/bin/env bash
set -euo pipefail

REPO=""
DRY_RUN="false"
REF=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --ref)
      REF="$2"
      shift 2
      ;;
    --ref=*)
      REF="${1#*=}"
      shift
      ;;
    *)
      if [[ -z "$REPO" ]]; then
        REPO="$1"
      else
        echo "Unexpected argument: $1"
        exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "$REPO" ]]; then
  echo "Usage: scripts/sandbox/install-task-assistant.sh <owner/repo> [--ref <tag|branch>] [--dry-run]"
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

# ------------------------------------------------------------
# Resolve ref (default: latest release)
# ------------------------------------------------------------
if [[ -z "$REF" ]]; then
  REF="$(gh release list \
    --repo automated-assistant-systems/task-assistant \
    --limit 1 \
    --json tagName \
    --jq '.[0].tagName')"

  if [[ -z "$REF" ]]; then
    echo "❌ Unable to determine latest release tag"
    exit 1
  fi
fi

echo
echo "📦 Task Assistant — Marketplace Install"
echo "Target repo:  $REPO"
echo "Ref:          $REF"
echo "Mode:         $([[ "$DRY_RUN" == "true" ]] && echo "DRY-RUN" || echo "INSTALL")"
echo

# ------------------------------------------------------------
# Validate ref exists remotely
# ------------------------------------------------------------
if ! git ls-remote --exit-code https://github.com/automated-assistant-systems/task-assistant.git "$REF" >/dev/null 2>&1; then
  echo "❌ Ref does not exist in Task Assistant repo: $REF"
  exit 1
fi

# ------------------------------------------------------------
# Integrity checks
# ------------------------------------------------------------
[[ -f "$ROOT_DIR/.github/task-assistant.yml" ]] || {
  echo "❌ Missing .github/task-assistant.yml"
  exit 1
}

[[ -f "$ROOT_DIR/.github/workflows/task-assistant-dispatch.yml" ]] || {
  echo "❌ Missing task-assistant-dispatch.yml"
  exit 1
}

# ------------------------------------------------------------
# Dry-run exit
# ------------------------------------------------------------
if [[ "$DRY_RUN" == "true" ]]; then
  echo "🧪 Dry-run complete"
  exit 0
fi

# ------------------------------------------------------------
# Install
# ------------------------------------------------------------
WORKDIR="$(mktemp -d)"
TARGET_DIR="$WORKDIR/target"
trap 'rm -rf "$WORKDIR"' EXIT

echo "→ Cloning target repo…"
gh repo clone "$REPO" "$TARGET_DIR" -- --quiet

mkdir -p "$TARGET_DIR/.github/workflows"

# Copy config as-is
rsync -a \
  "$ROOT_DIR/.github/task-assistant.yml" \
  "$TARGET_DIR/.github/task-assistant.yml"

# Copy dispatch and inject ref
TMP_DISPATCH="$WORKDIR/task-assistant-dispatch.yml"
cp "$ROOT_DIR/.github/workflows/task-assistant-dispatch.yml" "$TMP_DISPATCH"

# Replace ref in reusable workflow uses lines
sed -i \
  "s|automated-assistant-systems/task-assistant/.github/workflows/\(engine-.*\.yml\)@.*|automated-assistant-systems/task-assistant/.github/workflows/\1@$REF|g" \
  "$TMP_DISPATCH"

rsync -a \
  "$TMP_DISPATCH" \
  "$TARGET_DIR/.github/workflows/task-assistant-dispatch.yml"

cd "$TARGET_DIR"

git add .github/task-assistant.yml .github/workflows/task-assistant-dispatch.yml

if git diff --cached --quiet; then
  echo "✓ Repo already up to date"
else
  git commit -m "chore: install Task Assistant (@$REF)" >/dev/null
  git push >/dev/null
  echo "✓ Task Assistant installed into $REPO (@$REF)"
fi

echo
echo "✔ Install complete"
