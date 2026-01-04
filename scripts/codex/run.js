#!/usr/bin/env node
/* eslint-disable no-console */

import process from "process";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import { getInstallationToken } from "./github-app-auth.js";

/**
 * Codex runner with telemetry emission.
 * Phase 3.1 compliant:
 * - No host-repo writes
 * - Append-only telemetry
 * - Deterministic, observable execution
 */

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].replace(/^--/, "");
      args[key] = argv[i + 1];
      i++;
    }
  }
  return args;
}

function requireArg(name, value) {
  if (!value) {
    console.error(`Missing required argument: --${name}`);
    process.exit(1);
  }
}

function run(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

/* ────────────────────────────── */
/* Inputs */
/* ────────────────────────────── */

const args = parseArgs(process.argv.slice(2));

const repo = args.repo;
const issueNumber = args.issue;
const telemetryRepo =
  args["telemetry-repo"] ||
  process.env.TELEMETRY_REPO ||
  null;

requireArg("repo", repo);
requireArg("issue", issueNumber);

if (!telemetryRepo) {
  console.error("TELEMETRY_REPO not configured");
  process.exit(1);
}

/* ────────────────────────────── */
/* Execution Context */
/* ────────────────────────────── */

const correlationId = crypto.randomUUID();
const startedAt = new Date().toISOString();
let outcome = "success";
let failureReason = null;

console.log("Codex runner starting");
console.log(`Repo: ${repo}`);
console.log(`Issue: #${issueNumber}`);
console.log(`Telemetry repo: ${telemetryRepo}`);
console.log(`Correlation ID: ${correlationId}`);

/* ────────────────────────────── */
/* Execution */
/* ────────────────────────────── */

try {
  const bodyFile = path.join(os.tmpdir(), "codex-comment.txt");
  fs.writeFileSync(
    bodyFile,
    `🤖 Codex execution started\n\nCorrelation ID: ${correlationId}`
  );

  run(`gh issue comment ${issueNumber} --repo ${repo} --body-file ${bodyFile}`);

  // Future Codex behavior goes here

} catch (err) {
  outcome = "failure";
  failureReason = err.message || String(err);
  console.error("Codex execution failed");
  console.error(failureReason);
} finally {
  /* ────────────────────────────── */
  /* Telemetry Write (Always) */
  /* ────────────────────────────── */

  const telemetry = {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    correlation_id: correlationId,

    actor: "codex",
    action: "codex.execute",

    entity: {
      type: "issue",
      repo,
      number: Number(issueNumber)
    },

    outcome,
    reason: failureReason,

    execution: {
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      runner: "scripts/codex/run.js"
    }
  };

  const [owner] = telemetryRepo.split("/");

  const installationToken = getInstallationToken({
    appId: process.env.CODEX_APP_ID,
    privateKey: process.env.CODEX_PRIVATE_KEY,
    owner
  });

  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "codex-telemetry-")
  );

  run(
    `git clone https://x-access-token:${installationToken}@github.com/${telemetryRepo}.git ${tmpDir}`
  );

  run(`git -C ${tmpDir} config user.name "task-assistant[bot]"`);
  run(`git -C ${tmpDir} config user.email "task-assistant[bot]@users.noreply.github.com"`);

  const outDir = path.join(tmpDir, "codex");
  fs.mkdirSync(outDir, { recursive: true });

  const fileName =
    `${telemetry.generated_at.replace(/[:.]/g, "-")}-${correlationId}.json`;

  fs.writeFileSync(
    path.join(outDir, fileName),
    JSON.stringify(telemetry, null, 2)
  );

  run(`git -C ${tmpDir} add .`);
  run(`git -C ${tmpDir} commit -m "telemetry: codex.execute ${correlationId}"`);
  run(`git -C ${tmpDir} push`);

  try {
    run(`git -C ${tmpDir} add .`);
    run(
      `git -C ${tmpDir} commit -m "telemetry: codex.execute ${correlationId}"`
    );
    run(`git -C ${tmpDir} push`);
  } catch (telemetryErr) {
    console.error("Failed to write telemetry");
    console.error(telemetryErr.message);
  }

  if (outcome === "failure") {
    process.exit(1);
  }
}

console.log("Codex runner completed");
process.exit(0);
