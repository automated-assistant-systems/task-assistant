import path from "path";

/**
 * Repo preparation enhancement task
 *
 * Capability:
 * - Improve repo preparation tooling correctness
 * - Ensure GitHub API usage is pagination-safe
 * - Instrument config validation outcomes
 * - Surface telemetry hooks for orchestration layer
 *
 * This task is reusable across:
 * - Repo hygiene improvements
 * - Telemetry instrumentation
 * - Enforcement correctness work
 *
 * This task:
 * - Does NOT perform git operations
 * - Does NOT emit telemetry directly
 * - Does NOT know about issues, PRs, or phases
 */
export async function runTask({ repoPath, intent, utils }) {
  const target = path.join(repoPath, "scripts/prepare-repo.js");

  if (!utils.fileExists(target)) {
    return {
      changed: false,
      summary: "prepare-repo.js not found",
      filesTouched: [],
      errors: [`Missing file: ${target}`],
    };
  }

  let source = utils.readFile(target);
  let updated = source;
  let changed = false;

  /* ──────────────────────────────
     Pagination safety (labels / milestones)
     ────────────────────────────── */
  if (
    intent.instructions.includes("fix pagination") &&
    !source.includes("--limit 100")
  ) {
    updated = updated.replace(
      /gh label list --repo \$\{repo\} --json ([^\n]+)/g,
      "gh label list --repo ${repo} --limit 100 --json $1"
    );

    changed = true;
  }

  /* ──────────────────────────────
     Config validation telemetry hook
     ────────────────────────────── */
  if (
    intent.instructions.includes("add config validation telemetry") &&
    !source.includes("prepare-repo.config_validation_failed")
  ) {
    updated = updated.replace(
      /console\.error\("Invalid configuration file"\);/g,
      `
console.error("Invalid configuration file");

emitTelemetry({
  action: "prepare-repo.config_validation_failed",
  outcome: "failed",
  reason: "invalid_config",
});
`.trim()
    );

    changed = true;
  }

  /* ──────────────────────────────
     Telemetry repo awareness (passive)
     ────────────────────────────── */
  if (
    intent.instructions.includes("add telemetry repo support") &&
    !source.includes("TELEMETRY_REPO")
  ) {
    updated =
      `
const TELEMETRY_REPO = process.env.TELEMETRY_REPO || null;
`
        .trim() +
      "\n\n" +
      updated;

    changed = true;
  }

  /* ──────────────────────────────
     Write changes if required
     ────────────────────────────── */
  if (changed && updated !== source) {
    utils.writeFile(target, updated);
  }

  return {
    changed,
    summary: changed
      ? "Enhanced repo preparation tooling"
      : "Repo preparation tooling already satisfies requested capabilities",
    filesTouched: changed ? [target] : [],
    validation: {
      commands: ["node scripts/prepare-repo.js --dry-run <owner/repo>"],
      notes: ["Ensure TELEMETRY_REPO is configured in orchestration layer"],
    },
  };
}
