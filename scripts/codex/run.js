#!/usr/bin/env node

import crypto from "crypto";
import { execSync } from "child_process";
import { TASKS } from "./tasks/index.js";
import { createTaskUtils } from "./task-utils.js";

/* ──────────────────────────────
   Constants
   ────────────────────────────── */

const TERMINAL_LABELS = ["SUCCESS", "PARTIAL", "BLOCKED", "FAILED"];

/* ──────────────────────────────
   Utilities
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
  run(`gh issue comment ${issueNumber} --repo ${repo} --body-file -`, {
    input: body,
  });
}

function applyExclusiveStatusLabel(repo, issueNumber, status) {
  const toRemove = TERMINAL_LABELS.filter(l => l !== status);
  if (toRemove.length) {
    run(
      `gh issue edit ${issueNumber} --repo ${repo} ` +
      toRemove.map(l => `--remove-label "${l}"`).join(" ")
    );
  }
  run(
    `gh issue edit ${issueNumber} --repo ${repo} --add-label "${status}"`
  );
}

/* ──────────────────────────────
   Telemetry (sink only — no local writes)
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

  // Phase 3.2 contract:
  // This function is a terminal sink hook.
  // The supervisor or runner environment
  // is responsible for routing this record
  // to the telemetry repository.
  console.log("TELEMETRY_RECORD", JSON.stringify(record));
}

/* ──────────────────────────────
   Unified outcome handler
   ────────────────────────────── */

function applyOutcome({
  status,
  repo,
  issueNumber,
  startedAt,
  correlationId,
  reason,
  commentBody,
}) {
  if (commentBody) {
    comment(issueNumber, repo, commentBody);
  }

  applyExclusiveStatusLabel(repo, issueNumber, status);

  emitTelemetry({
    repo,
    issueNumber,
    outcome: status.toLowerCase(),
    reason,
    startedAt,
    correlationId,
  });
}

/* ──────────────────────────────
   Intent handling
   ────────────────────────────── */

function parseIntent(issueBody) {
  const match = issueBody.match(/```codex([\s\S]*?)```/);
  if (!match) throw new Error("Missing ```codex``` intent block");

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
    execSync(cmd, { cwd: repoPath, stdio: "inherit" });
  }
}

/* ──────────────────────────────
   Remediation (PARTIAL)
   ────────────────────────────── */

function remediationHints(result) {
  const hints = [];

  if (result.validation?.commands?.length) {
    hints.push(
      "**Validation checks failed. Suggested actions:**",
      ...result.validation.commands.map(c => `- Run locally: \`${c}\``)
    );
  }

  if (result.validation?.notes?.length) {
    hints.push(
      "",
      "**Notes:**",
      ...result.validation.notes.map(n => `- ${n}`)
    );
  }

  if (!hints.length) {
    hints.push("Review the PR diff and logs to identify failing checks.");
  }

  return hints.join("\n");
}

/* ──────────────────────────────
   Main
   ────────────────────────────── */

async function main() {
  const args = process.argv.slice(2);
  const repo = args[args.indexOf("--repo") + 1];
  const issueNumber = args[args.indexOf("--issue") + 1];

  if (!repo || !issueNumber) {
    console.error("Usage: run.js --repo <owner/repo> --issue <number>");
    process.exit(1);
  }

  const startedAt = now();
  const correlationId = newCorrelationId();

  const issue = JSON.parse(
    run(`gh issue view ${issueNumber} --repo ${repo} --json body`)
  );

  let intent;
  try {
    intent = parseIntent(issue.body);
  } catch (err) {
    return applyOutcome({
      status: "BLOCKED",
      repo,
      issueNumber,
      startedAt,
      correlationId,
      reason: err.message,
      commentBody: `⛔ **BLOCKED**\n\n${err.message}`,
    });
  }

  const intentError = validateIntent(intent);
  if (intentError) {
    return applyOutcome({
      status: "BLOCKED",
      repo,
      issueNumber,
      startedAt,
      correlationId,
      reason: intentError,
      commentBody: `⛔ **BLOCKED**\n\n${intentError}`,
    });
  }

  const repoPath = process.cwd();
  const branch = `codex/${intent.task}/${issueNumber}`;

  try {
    run(`git checkout -b ${branch}`);

    const result = await TASKS[intent.task]({
      repoPath,
      intent,
      mode: "apply",
      utils: createTaskUtils(repoPath),
    });

    if (!result.changed) {
      return applyOutcome({
        status: "SUCCESS",
        repo,
        issueNumber,
        startedAt,
        correlationId,
        reason: "no_changes_required",
        commentBody: `✅ **SUCCESS**\n\nNo changes were required.\n\n${result.summary}`,
      });
    }

    let validationFailed = false;
    try {
      runValidation(result.validation, repoPath);
    } catch {
      validationFailed = true;
    }

    run(`git add ${result.filesTouched.join(" ")}`);
    run(`git commit -m "${result.summary}"`);
    run(`git push origin ${branch}`);

    const pr = JSON.parse(
      run(
        `gh pr create --repo ${repo} \
         --head ${branch} \
         --base main \
         --title "${result.summary}" \
         --body "Automated Codex execution for issue #${issueNumber}"`
      )
    );

    if (validationFailed) {
      return applyOutcome({
        status: "PARTIAL",
        repo,
        issueNumber,
        startedAt,
        correlationId,
        reason: "validation_failed",
        commentBody:
          `🟡 **PARTIAL**\n\nPR opened but validation failed.\n\nPR: ${pr.url}\n\n` +
          remediationHints(result),
      });
    }

    return applyOutcome({
      status: "SUCCESS",
      repo,
      issueNumber,
      startedAt,
      correlationId,
      commentBody:
        `✅ **SUCCESS**\n\nPR opened and validation passed.\n\nPR: ${pr.url}`,
    });
  } catch (err) {
    return applyOutcome({
      status: "FAILED",
      repo,
      issueNumber,
      startedAt,
      correlationId,
      reason: err.message,
      commentBody:
        `❌ **FAILED**\n\n\`\`\`\n${err.message}\n\`\`\``,
    });
  }
}

main().catch(() => process.exit(1));
