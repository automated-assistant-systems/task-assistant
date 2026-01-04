#!/usr/bin/env node

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import { TASKS } from "./tasks/index.js";
import { createTaskUtils } from "./task-utils.js";

/* ──────────────────────────────
   Constants
   ────────────────────────────── */

const STATUS_LABELS = {
  SUCCESS: "SUCCESS",
  PARTIAL: "PARTIAL",
  BLOCKED: "BLOCKED",
  FAILED: "FAILED",
};

/* ──────────────────────────────
   Utility helpers
   ────────────────────────────── */

function now() {
  return new Date().toISOString();
}

function newCorrelationId() {
  return crypto.randomUUID();
}

function run(cmd, options = {}) {
  console.log(`$ ${cmd}`);
  return execSync(cmd, {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  }).trim();
}

function comment(issueNumber, repo, body) {
  run(
    `gh issue comment ${issueNumber} --repo ${repo} --body-file -`,
    { input: body }
  );
}

function applyStatusLabel(repo, issueNumber, status) {
  const label = STATUS_LABELS[status];
  if (!label) return;

  run(
    `gh issue edit ${issueNumber} --repo ${repo} --add-label "${label}"`
  );
}

/* ──────────────────────────────
   Telemetry
   ────────────────────────────── */

function emitTelemetry({
  repo,
  issueNumber,
  outcome,
  reason,
  startedAt,
  correlationId,
}) {
  const record = {
    schema_version: "1.0",
    generated_at: now(),
    correlation_id: correlationId,
    actor: "codex",
    action: "codex.execute",
    entity: {
      type: "issue",
      repo,
      number: Number(issueNumber),
    },
    outcome,
    reason: reason || null,
    execution: {
      started_at: startedAt,
      finished_at: now(),
      runner: "scripts/codex/run.js",
    },
  };

  // Terminal emission point.
  // Replace or forward this sink to telemetry repo writer as needed.
  fs.writeFileSync(
    path.join(process.cwd(), "codex-telemetry.json"),
    JSON.stringify(record, null, 2)
  );
}

/* ──────────────────────────────
   Intent handling
   ────────────────────────────── */

function parseIntentFromIssue(issueBody) {
  const match = issueBody.match(/```codex([\s\S]*?)```/);

  if (!match) {
    throw new Error("Missing ```codex``` intent block");
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    throw new Error("Invalid JSON in ```codex``` intent block");
  }
}

function validateIntent(intent) {
  if (!intent.task) return "Missing required field: task";
  if (!Array.isArray(intent.instructions))
    return "Missing or invalid instructions array";
  if (!TASKS[intent.task])
    return `Unknown Codex task: ${intent.task}`;
  return null;
}

function runValidation(validation, repoPath) {
  if (!validation?.commands) return;

  for (const cmd of validation.commands) {
    execSync(cmd, {
      cwd: repoPath,
      stdio: "inherit",
    });
  }
}

/* ──────────────────────────────
   Remediation hints (PARTIAL)
   ────────────────────────────── */

function remediationHints(result) {
  const hints = [];

  if (result.validation?.commands?.length) {
    hints.push(
      "**Validation checks failed. Suggested actions:**",
      ...result.validation.commands.map(
        (c) => `- Run locally: \`${c}\``
      )
    );
  }

  if (result.validation?.notes?.length) {
    hints.push(
      "",
      "**Notes:**",
      ...result.validation.notes.map((n) => `- ${n}`)
    );
  }

  if (!hints.length) {
    hints.push(
      "Review the PR diff and logs to identify failing checks."
    );
  }

  return hints.join("\n");
}

/* ──────────────────────────────
   Main execution
   ────────────────────────────── */

async function main() {
  const args = process.argv.slice(2);
  const repo = args[args.indexOf("--repo") + 1];
  const issueNumber = args[args.indexOf("--issue") + 1];

  if (!repo || !issueNumber) {
    console.error(
      "Usage: run.js --repo <owner/repo> --issue <number>"
    );
    process.exit(1);
  }

  const startedAt = now();
  const correlationId = newCorrelationId();

  // Fetch issue
  const issue = JSON.parse(
    run(`gh issue view ${issueNumber} --repo ${repo} --json body`)
  );

  let intent;
  try {
    intent = parseIntentFromIssue(issue.body);
  } catch (err) {
    comment(
      issueNumber,
      repo,
      `⛔ **BLOCKED**\n\n${err.message}`
    );
    applyStatusLabel(repo, issueNumber, "BLOCKED");
    emitTelemetry({
      repo,
      issueNumber,
      outcome: "blocked",
      reason: err.message,
      startedAt,
      correlationId,
    });
    return;
  }

  const intentError = validateIntent(intent);
  if (intentError) {
    comment(
      issueNumber,
      repo,
      `⛔ **BLOCKED**\n\n${intentError}`
    );
    applyStatusLabel(repo, issueNumber, "BLOCKED");
    emitTelemetry({
      repo,
      issueNumber,
      outcome: "blocked",
      reason: intentError,
      startedAt,
      correlationId,
    });
    return;
  }

  const repoPath = process.cwd();
  const branch = `codex/${intent.task}/${issueNumber}`;

  try {
    // Create branch
    run(`git checkout -b ${branch}`);

    // Dispatch task
    const result = await TASKS[intent.task]({
      repoPath,
      intent,
      mode: "apply",
      utils: createTaskUtils(repoPath),
    });

    // No changes → SUCCESS
    if (!result.changed) {
      comment(
        issueNumber,
        repo,
        `✅ **SUCCESS**\n\nNo changes were required.\n\n${result.summary}`
      );
      applyStatusLabel(repo, issueNumber, "SUCCESS");
      emitTelemetry({
        repo,
        issueNumber,
        outcome: "success",
        reason: "no_changes_required",
        startedAt,
        correlationId,
      });
      return;
    }

    // Validation
    let validationFailed = false;
    try {
      runValidation(result.validation, repoPath);
    } catch {
      validationFailed = true;
    }

    // Commit & push
    run(`git add ${result.filesTouched.join(" ")}`);
    run(`git commit -m "${result.summary}"`);
    run(`git push origin ${branch}`);

    // Open PR
    const pr = JSON.parse(
      run(
        `gh pr create --repo ${repo} \
         --head ${branch} \
         --base main \
         --title "${result.summary}" \
         --body "Automated Codex execution for issue #${issueNumber}"`
      )
    );

    // Final outcome
    if (validationFailed) {
      const hints = remediationHints(result);

      comment(
        issueNumber,
        repo,
        `🟡 **PARTIAL**\n\nPR opened but validation failed.\n\nPR: ${pr.url}\n\n${hints}`
      );
      applyStatusLabel(repo, issueNumber, "PARTIAL");
      emitTelemetry({
        repo,
        issueNumber,
        outcome: "partial",
        reason: "validation_failed",
        startedAt,
        correlationId,
      });
    } else {
      comment(
        issueNumber,
        repo,
        `✅ **SUCCESS**\n\nPR opened and validation passed.\n\nPR: ${pr.url}`
      );
      applyStatusLabel(repo, issueNumber, "SUCCESS");
      emitTelemetry({
        repo,
        issueNumber,
        outcome: "success",
        startedAt,
        correlationId,
      });
    }
  } catch (err) {
    comment(
      issueNumber,
      repo,
      `❌ **FAILED**\n\n\`\`\`\n${err.message}\n\`\`\``
    );
    applyStatusLabel(repo, issueNumber, "FAILED");
    emitTelemetry({
      repo,
      issueNumber,
      outcome: "failed",
      reason: err.message,
      startedAt,
      correlationId,
    });
    throw err;
  }
}

main().catch(() => process.exit(1));
