#!/usr/bin/env node

import crypto from "crypto";
import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";
import { TASK_ENGINES } from "./tasks/index.js";
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
  if (!TASK_ENGINES[intent.task])
    return `Unknown Codex task: ${intent.task}`;
  return null;
}

/* ──────────────────────────────
   Validation / remediation
   ────────────────────────────── */

function runValidation(validation, repoPath) {
  if (!validation?.commands) return;
  for (const cmd of validation.commands) {
    execSync(cmd, { cwd: repoPath, stdio: "inherit" });
  }
}

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
  const telemetry = {
    schema_version: "1.0",
    correlation_id: newCorrelationId(),
    generated_at: startedAt,
  };

  const enforcementReport = {
    repo: {
      owner: repo.split("/")[0],
      repo: repo.split("/")[1],
    },
    issue: {
      number: Number(issueNumber),
    },
    actor: {
      login: "codex",
    },
    final_state: null,
    checks: [],
    actions: [],
    notes: [],
  };

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
  });

  try {
    const issue = JSON.parse(
      run(`gh issue view ${issueNumber} --repo ${repo} --json body`)
    );

    let intent;
    try {
      intent = parseIntent(issue.body);
    } catch (err) {
      enforcementReport.final_state = "BLOCKED";
      enforcementReport.checks.push({
        id: "intent.parse",
        outcome: "FAIL",
        evidence: err.message,
      });

      comment(
        issueNumber,
        repo,
        `⛔ **BLOCKED**\n\n${err.message}`
      );

      applyExclusiveStatusLabel(repo, issueNumber, "BLOCKED");
      return;
    }

    const intentError = validateIntent(intent);
    if (intentError) {
      enforcementReport.final_state = "BLOCKED";
      enforcementReport.checks.push({
        id: "intent.validate",
        outcome: "FAIL",
        evidence: intentError,
      });

      comment(
        issueNumber,
        repo,
        `⛔ **BLOCKED**\n\n${intentError}`
      );

      applyExclusiveStatusLabel(repo, issueNumber, "BLOCKED");
      return;
    }

    enforcementReport.checks.push({
      id: "intent.validate",
      outcome: "PASS",
    });

    const repoPath = process.cwd();
    const branch = `codex/${intent.task}/${issueNumber}`;

    run(`git checkout -b ${branch}`);

    const result = await TASK_ENGINES[intent.task]({
      repoPath,
      intent,
      mode: "apply",
      utils: createTaskUtils(repoPath),
    });

    if (!result.changed) {
      enforcementReport.final_state = "SUCCESS";
      comment(
        issueNumber,
        repo,
        `✅ **SUCCESS**\n\nNo changes were required.\n\n${result.summary}`
      );
      applyExclusiveStatusLabel(repo, issueNumber, "SUCCESS");
      return;
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
      enforcementReport.final_state = "PARTIAL";
      comment(
        issueNumber,
        repo,
        `🟡 **PARTIAL**\n\nPR opened but validation failed.\n\nPR: ${pr.url}\n\n` +
          remediationHints(result)
      );
      applyExclusiveStatusLabel(repo, issueNumber, "PARTIAL");
      return;
    }

    enforcementReport.final_state = "SUCCESS";
    comment(
      issueNumber,
      repo,
      `✅ **SUCCESS**\n\nPR opened and validation passed.\n\nPR: ${pr.url}`
    );
    applyExclusiveStatusLabel(repo, issueNumber, "SUCCESS");
  } catch (err) {
    enforcementReport.final_state = "FAILED";
    comment(
      issueNumber,
      repo,
      `❌ **FAILED**\n\n\`\`\`\n${err.message}\n\`\`\``
    );
    applyExclusiveStatusLabel(repo, issueNumber, "FAILED");
  } finally {
    // 🔒 Phase 3.2 invariant: telemetry ALWAYS emits
    await TASK_ENGINES["enforcement-telemetry"]({
      octokit,
      telemetry,
      enforcementReport,
    });
  }
}

main().catch(() => process.exit(1));
