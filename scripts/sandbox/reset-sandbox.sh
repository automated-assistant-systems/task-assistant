#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Task Assistant — Sandbox Reset
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
#   • Refuses to run on non-sandbox repos
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
# Guardrail: sandbox-only
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
# Dependencies
# ------------------------------------------------------------
for cmd in gh jq node; do
  command -v "$cmd" >/dev/null || {
    echo "❌ Missing dependency: $cmd"
    exit 1
  }
done

OWNER="${REPO%%/*}"
REPO_NAME="${REPO##*/}"

echo
echo "🧹 Task Assistant — Sandbox Reset"
echo "Repo:            $REPO"
echo "Reset telemetry: $RESET_TELEMETRY"
echo

# ------------------------------------------------------------
# Auth check (operator scripts require stored gh auth)
# ------------------------------------------------------------
if ! gh auth status >/dev/null 2>&1; then
  echo "❌ gh is not authenticated."
  echo "   Run: gh auth login"
  exit 1
fi

# ------------------------------------------------------------
# 1) Close open issues (preserve history)
# ------------------------------------------------------------
echo "→ Closing open issues..."
OPEN_ISSUES="$(gh issue list --repo "$REPO" --state open --limit 200 --json number --jq '.[].number' || true)"

if [[ -n "$OPEN_ISSUES" ]]; then
  while IFS= read -r n; do
    gh issue close "$n" --repo "$REPO" \
      --comment "Sandbox reset — Phase 3.4 validation baseline" >/dev/null
    echo "✓ Closed issue #$n"
  done <<< "$OPEN_ISSUES"
else
  echo "✓ No open issues"
fi

# ------------------------------------------------------------
# 2) Delete phase-* and track/* labels
# ------------------------------------------------------------
echo
echo "→ Deleting phase-* and track/* labels..."
LABELS="$(gh label list --repo "$REPO" --limit 200 --json name \
  | jq -r '.[].name' | grep -E '^(phase-|track/)' || true)"

if [[ -n "$LABELS" ]]; then
  while IFS= read -r lbl; do
    gh label delete "$lbl" --repo "$REPO" --yes >/dev/null || true
    echo "✓ Deleted label: $lbl"
  done <<< "$LABELS"
else
  echo "✓ No phase/track labels to delete"
fi

# ------------------------------------------------------------
# 3) Delete all milestones
# ------------------------------------------------------------
echo
echo "→ Deleting milestones..."
MILESTONES="$(gh api "repos/$REPO/milestones?state=all&per_page=100" \
  --paginate | jq -r '.[].number' || true)"

if [[ -n "$MILESTONES" ]]; then
  while IFS= read -r m; do
    gh api -X DELETE "repos/$REPO/milestones/$m" >/dev/null || true
    echo "✓ Deleted milestone #$m"
  done <<< "$MILESTONES"
else
  echo "✓ No milestones to delete"
fi

# ------------------------------------------------------------
# 4) Optional telemetry reset (infra-aware)
# ------------------------------------------------------------
if [[ "$RESET_TELEMETRY" == "true" ]]; then
  echo
  echo "→ Resolving telemetry repo via infra..."

  export TARGET_REPO="$REPO"

  TELEMETRY_REPO="$(
    node -e '
    import { execSync } from "child_process";
    import { resolveInfraForRepo } from "./lib/infra.js";

    const target = process.env.TARGET_REPO;

    if (!target) {
      console.error("Missing TARGET_REPO");
      process.exit(1);
    }

    let token;
    try {
      token = execSync("gh auth token", { encoding: "utf8" }).trim();
    } catch {
      console.error("Failed to obtain GitHub token from gh");
      process.exit(1);
    }

    const result = await resolveInfraForRepo({
      targetRepo: target,
      githubToken: token,
    });

    if (!result.telemetryRepo) {
      console.error("Telemetry repo not resolved");
      process.exit(1);
    }

    process.stdout.write(result.telemetryRepo);
    '
  )"

  if [[ -z "$TELEMETRY_REPO" ]]; then
    echo "::error::Failed to resolve telemetry repo"
    exit 1
  fi

  echo "✓ Telemetry repo resolved: $TELEMETRY_REPO"
  echo "→ Deleting telemetry/v1/repos/$REPO_NAME …"

  # Instead of deleting the repo directory
  # enumerate and delete children

  echo "→ Deleting telemetry/v1/repos/$REPO_NAME …"

  BASE_PATH="telemetry/v1/repos/$REPO_NAME"

  DATES="$(gh api "repos/$TELEMETRY_REPO/contents/$BASE_PATH" \
    --jq '.[] | select(.type=="dir") | .name' 2>/dev/null || true)"

  if [[ -z "$DATES" ]]; then
    echo "ℹ️ No telemetry dates found (already clean)"
  else
    for date in $DATES; do
      echo "  → Clearing date $date"

      CORR_DIRS="$(gh api "repos/$TELEMETRY_REPO/contents/$BASE_PATH/$date" \
        --jq '.[] | select(.type=="dir") | .name' || true)"

      for cid in $CORR_DIRS; do
        echo "    → Clearing correlation $cid"

        gh api "repos/$TELEMETRY_REPO/contents/$BASE_PATH/$date/$cid" \
          --jq '.[] | select(.type=="file") | [.path, .sha] | @tsv' |
        while IFS=$'\t' read -r path sha; do
          gh api -X DELETE "repos/$TELEMETRY_REPO/contents/$path" \
            -f message="reset sandbox telemetry" \
            -f sha="$sha" >/dev/null
          echo "      ✓ Deleted $path"
        done
      done
    done
  fi

  echo "✓ Telemetry reset complete"

fi

# ------------------------------------------------------------
# Summary
# ------------------------------------------------------------
echo
echo "✔ Sandbox reset complete"
echo
echo "Baseline state:"
echo "✓ No open issues"
echo "✓ No phase/track labels"
echo "✓ No milestones"

if [[ "$RESET_TELEMETRY" == "true" ]]; then
  echo "✓ Telemetry cleared for $REPO_NAME"
else
  echo "ℹ️ Telemetry NOT reset (use --reset-telemetry for clean baseline)"
fi

echo
