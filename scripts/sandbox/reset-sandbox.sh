#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Task Assistant — Sandbox Reset (INFRA v2 ONLY, operator tool)
#
# Resets a sandbox repo to a known baseline:
#   • Closes open issues (history preserved)
#   • Deletes phase-* and track/* labels
#   • Deletes all milestones
#
# Optional:
#   • --reset-telemetry → deletes repo telemetry directory
#
# Safety:
#   • Refuses to run inside GitHub Actions
#   • Refuses to run unless infra context == sandbox && enabled
#   • Idempotent (safe to run repeatedly)
# ============================================================

REPO=""
RESET_TELEMETRY="false"

for arg in "$@"; do
  case "$arg" in
    --reset-telemetry) RESET_TELEMETRY="true" ;;
    *) REPO="$arg" ;;
  esac
done

if [[ -z "$REPO" ]]; then
  echo "Usage: scripts/sandbox/reset-sandbox.sh <owner/repo> [--reset-telemetry]"
  exit 1
fi

# ------------------------------------------------------------
# Guardrail: operator-only
# ------------------------------------------------------------
if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  echo "ℹ️ reset-sandbox skipped (operator-only; CI environment detected)"
  exit 0
fi

# ------------------------------------------------------------
# Dependencies
# ------------------------------------------------------------
for cmd in gh jq node; do
  command -v "$cmd" >/dev/null || { echo "❌ Missing dependency: $cmd"; exit 1; }
done

# ------------------------------------------------------------
# Auth check (429-safe)
# ------------------------------------------------------------
AUTH_ERR="$(mktemp)"

if ! gh api rate_limit >/dev/null 2>"$AUTH_ERR"; then
  if grep -q "429" "$AUTH_ERR"; then
    echo "⚠️  GitHub API temporarily throttled — proceeding"
  else
    echo "❌ gh is not authenticated."
    echo "   Set GH_TOKEN or run: gh auth login"
    cat "$AUTH_ERR" >&2
    rm -f "$AUTH_ERR"
    exit 1
  fi
fi

rm -f "$AUTH_ERR"

OWNER="${REPO%%/*}"
REPO_NAME="${REPO##*/}"

echo
echo "🧹 Task Assistant — Sandbox Reset"
echo "Repo:            $REPO"
echo "Reset telemetry: $RESET_TELEMETRY"
echo

# ------------------------------------------------------------
# Resolve infra context/state (v2 only)
# ------------------------------------------------------------
INFRA_JSON="$(
  GITHUB_TOKEN="$(gh auth token)" \
  node scripts/infra/resolve-repo-context.js "$REPO"
)"

CONTEXT="$(jq -r '.context' <<<"$INFRA_JSON")"
STATE="$(jq -r '.state' <<<"$INFRA_JSON")"

if [[ "$CONTEXT" != "sandbox" || "$STATE" != "enabled" ]]; then
  echo "❌ Refusing to reset non-sandbox repo: $REPO"
  echo "   infra context=$CONTEXT state=$STATE"
  exit 1
fi

# ------------------------------------------------------------
# 1) Close open issues
# ------------------------------------------------------------
echo "→ Closing open issues..."
OPEN_ISSUES="$(gh issue list --repo "$REPO" --state open --limit 200 --json number --jq '.[].number' || true)"

if [[ -n "$OPEN_ISSUES" ]]; then
  while IFS= read -r n; do
    gh issue close "$n" --repo "$REPO" \
      --comment "Sandbox reset — Phase 3.4 validation baseline" >/dev/null || true
    echo "✓ Closed issue #$n"
  done <<<"$OPEN_ISSUES"
else
  echo "✓ No open issues"
fi

# ------------------------------------------------------------
# 2) Delete phase-* and track/* labels
# ------------------------------------------------------------
echo
echo "→ Deleting phase-* and track/* labels..."
LABELS="$(
  gh label list --repo "$REPO" --limit 200 --json name |
  jq -r '.[].name' |
  grep -E '^(phase-|track/)' || true
)"

if [[ -n "$LABELS" ]]; then
  while IFS= read -r lbl; do
    gh label delete "$lbl" --repo "$REPO" --yes >/dev/null || true
    echo "✓ Deleted label: $lbl"
  done <<<"$LABELS"
else
  echo "✓ No phase/track labels to delete"
fi

# ------------------------------------------------------------
# 3) Delete all milestones
# ------------------------------------------------------------
echo
echo "→ Deleting milestones..."
MILESTONES="$(
  gh api "repos/$REPO/milestones?state=all&per_page=100" --paginate |
  jq -r '.[].number' 2>/dev/null || true
)"

if [[ -n "$MILESTONES" ]]; then
  while IFS= read -r m; do
    gh api -X DELETE "repos/$REPO/milestones/$m" >/dev/null || true
    echo "✓ Deleted milestone #$m"
  done <<<"$MILESTONES"
else
  echo "✓ No milestones to delete"
fi

# ------------------------------------------------------------
# 4) Optional telemetry reset (use infra-resolved telemetry repo)
# ------------------------------------------------------------
if [[ "$RESET_TELEMETRY" == "true" ]]; then
  echo
  echo "→ Resolving telemetry repo via infra..."
  TELEMETRY_REPO="$(
    GITHUB_TOKEN="$(gh auth token)" \
    node scripts/infra/resolve-telemetry-repo.js "$REPO"
  )"

  if [[ -z "$TELEMETRY_REPO" ]]; then
    echo "❌ Failed to resolve telemetry repo"
    exit 1
  fi

  echo "✓ Telemetry repo resolved: $TELEMETRY_REPO"

  # NOTE: telemetry schema v1 path, independent of infra version.
  BASE_PATH="telemetry/v1/repos/$REPO_NAME"
  echo "→ Clearing telemetry at $BASE_PATH"

  # If base path doesn't exist, treat as already clean.
  DATES="$(
    gh api "repos/$TELEMETRY_REPO/contents/$BASE_PATH" \
      --jq '.[] | select(.type=="dir") | .name' 2>/dev/null || true
  )"

  if [[ -z "$DATES" ]]; then
    echo "ℹ️ No telemetry found (already clean)"
  else
    for date in $DATES; do
      CORR_DIRS="$(
        gh api "repos/$TELEMETRY_REPO/contents/$BASE_PATH/$date" \
          --jq '.[] | select(.type=="dir") | .name' 2>/dev/null || true
      )"

      if [[ -z "$CORR_DIRS" ]]; then
        continue
      fi

      for cid in $CORR_DIRS; do
        FILES="$(
          gh api "repos/$TELEMETRY_REPO/contents/$BASE_PATH/$date/$cid" \
            --jq '.[] | select(.type=="file") | [.path, .sha] | @tsv' \
            2>/dev/null || true
        )"

        [[ -z "$FILES" ]] && continue

        while IFS=$'\t' read -r path sha; do
          [[ -n "$path" && -n "$sha" ]] || continue
          gh api -X DELETE "repos/$TELEMETRY_REPO/contents/$path" \
            -f message="reset sandbox telemetry" \
            -f sha="$sha" >/dev/null || true
          echo "✓ Deleted $path"
        done <<<"$FILES"
      done
    done
  fi

  echo "✓ Telemetry reset complete"
fi

echo
echo "✔ Sandbox reset complete"
