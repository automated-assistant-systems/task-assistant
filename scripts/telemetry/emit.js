#!/usr/bin/env node
/**
 * Telemetry Emitter (Schema v1)
 *
 * Invariants:
 * - Reads a single JSON object from stdin
 * - Writes ONLY to repo-scoped telemetry paths
 * - Never writes to meta
 * - Uses GH_TOKEN for authenticated cross-repo git operations
 */

import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

/* ──────────────────────────────
   Utilities
   ────────────────────────────── */

function run(cmd) {
  return execSync(cmd, { stdio: "pipe" }).toString().trim();
}

function fail(msg) {
  console.error(`⚠️ telemetry: ${msg}`);
  process.exit(0); // telemetry must never fail workflows
}

/* ──────────────────────────────
   Environment
   ────────────────────────────── */

const GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!GH_TOKEN) fail("GH_TOKEN is required");

const TELEMETRY_REPO = process.env.TELEMETRY_REPO;
if (!TELEMETRY_REPO) fail("TELEMETRY_REPO is not set");

/* ──────────────────────────────
   Read stdin
   ────────────────────────────── */

let input = "";
process.stdin.on("data", chunk => (input += chunk));
process.stdin.on("end", () => {
  input = input.trim();
  if (!input) fail("empty telemetry payload");

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    fail("invalid JSON input");
  }

  /* ──────────────────────────────
     Validate minimal schema
     ────────────────────────────── */

  if (!payload.generated_at || !payload.entity?.repo) {
    fail("missing required telemetry fields");
  }

  /* ──────────────────────────────
     Resolve repo-scoped path
     ────────────────────────────── */

  const repo = payload.entity.repo;
  const date = payload.generated_at.slice(0, 10);

  // 🔒 HARD RULE: repo telemetry ONLY
  const relPath = path.join(
    "telemetry",
    "v1",
    "repos",
    repo,
    `${date}.jsonl`
  );

  /* ──────────────────────────────
     Clone telemetry repo
     ────────────────────────────── */

  const tmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "task-assistant-telemetry-")
  );

  try {
    run(
      `git clone https://github.com/${TELEMETRY_REPO}.git "${tmp}"`
    );

    run(
      `git -C "${tmp}" config user.name "task-assistant[bot]"`
    );
    run(
      `git -C "${tmp}" config user.email "task-assistant[bot]@users.noreply.github.com"`
    );

    // 🔑 Inject auth for ALL https operations (clone already done, push next)
    run(
      `git -C "${tmp}" config http.https://github.com/.extraheader "AUTHORIZATION: bearer ${GH_TOKEN}"`
    );

    const outFile = path.join(tmp, relPath);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });

    fs.appendFileSync(
      outFile,
      JSON.stringify(payload) + "\n"
    );

    run(`git -C "${tmp}" add "${relPath}"`);
    run(
      `git -C "${tmp}" commit -m "telemetry(v1): ${repo}"`
    );
    run(`git -C "${tmp}" push origin main`);
  } catch (err) {
    fail(err.message);
  }
});
