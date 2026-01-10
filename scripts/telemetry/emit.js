#!/usr/bin/env node
/**
 * Task Assistant — Telemetry Emitter (Phase 3.2 hardened)
 *
 * Guarantees:
 * - Repo-scoped telemetry ONLY
 * - No writes to meta for repo events
 * - Concurrency-safe git push (rebase + retry)
 * - Deterministic failure after bounded retries
 */

import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

/* ──────────────────────────────
   Configuration
   ────────────────────────────── */

const MAX_PUSH_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 750;

/* ──────────────────────────────
   Helpers
   ────────────────────────────── */

function run(cmd, opts = {}) {
  return execSync(cmd, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    ...opts,
  }).trim();
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/* ──────────────────────────────
   Read payload from stdin
   ────────────────────────────── */

let payloadRaw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => (payloadRaw += chunk));
process.stdin.on("end", () => main(payloadRaw));

/* ──────────────────────────────
   Main
   ────────────────────────────── */

function main(input) {
  if (!input) {
    console.error("⚠️ telemetry: empty payload");
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch (err) {
    console.error("⚠️ telemetry: invalid JSON payload");
    process.exit(1);
  }

  const telemetryRepo = process.env.TELEMETRY_REPO;
  if (!telemetryRepo) {
    console.error("⚠️ telemetry: TELEMETRY_REPO is not set");
    process.exit(1);
  }

  const ghToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!ghToken) {
    console.error("⚠️ telemetry: GH_TOKEN is not set");
    process.exit(1);
  }

  // Repo-scoped path ONLY
  const repoName = payload?.entity?.repo;
  if (!repoName) {
    console.error("⚠️ telemetry: missing entity.repo");
    process.exit(1);
  }

  const date = payload.generated_at?.slice(0, 10);
  if (!date) {
    console.error("⚠️ telemetry: missing generated_at");
    process.exit(1);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "task-assistant-telemetry-"));
  const repoDir = path.join(tmpDir, "telemetry");

  try {
    // Clone
    run(
      `git clone https://x-access-token:${ghToken}@github.com/${telemetryRepo}.git "${repoDir}"`
    );

    const outDir = path.join(repoDir, "telemetry", "v1", "repos", repoName);
    fs.mkdirSync(outDir, { recursive: true });

    const outFile = path.join(outDir, `${date}.jsonl`);
    fs.appendFileSync(outFile, JSON.stringify(payload) + "\n");

    run(`git -C "${repoDir}" add "${outFile}"`);

    try {
      run(`git -C "${repoDir}" diff --cached --quiet`);
      // No changes staged → telemetry already recorded
      return;
    } catch {
      // Changes exist → proceed to commit
    }

    run(
      `git -C "${repoDir}" commit -m "telemetry: ${payload.event?.category || "event"}"`,
      { stdio: ["ignore", "ignore", "ignore"] }
    );

    // Push with rebase + retry
    let attempt = 0;
    while (true) {
      try {
        run(`git -C "${repoDir}" pull --rebase`);
        run(`git -C "${repoDir}" push`);
        break;
      } catch (err) {
        attempt++;
        if (attempt >= MAX_PUSH_ATTEMPTS) {
          console.error("❌ telemetry: failed to push after retries");
          throw err;
        }
        const backoff = BASE_BACKOFF_MS * attempt;
        sleep(backoff);
      }
    }
  } catch (err) {
    console.error("❌ telemetry: emission failed");
    console.error(err.stderr?.toString() || err.message);
    process.exit(1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
