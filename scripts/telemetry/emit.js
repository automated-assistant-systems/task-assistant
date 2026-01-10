#!/usr/bin/env node
/**
 * Task Assistant — Telemetry Emitter (Phase 3.2 hardened)
 *
 * Guarantees:
 * - Repo-scoped telemetry ONLY
 * - No writes to meta
 * - Concurrency-safe (rebase before write)
 * - Never fails on empty commits
 */

import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

/* ──────────────────────────────
   Config
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
   Read stdin
   ────────────────────────────── */

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", c => (input += c));
process.stdin.on("end", () => main(input));

/* ──────────────────────────────
   Main
   ────────────────────────────── */

function main(raw) {
  if (!raw) process.exit(0);

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    console.error("⚠️ telemetry: invalid JSON");
    process.exit(1);
  }

  const telemetryRepo = process.env.TELEMETRY_REPO;
  const ghToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

  if (!telemetryRepo || !ghToken) {
    console.error("⚠️ telemetry: missing TELEMETRY_REPO or GH_TOKEN");
    process.exit(1);
  }

  const repoName = payload?.entity?.repo;
  const date = payload?.generated_at?.slice(0, 10);

  if (!repoName || !date) {
    console.error("⚠️ telemetry: missing entity.repo or generated_at");
    process.exit(1);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "task-assistant-telemetry-"));
  const repoDir = path.join(tmp, "telemetry");

  try {
    run(`git clone https://x-access-token:${ghToken}@github.com/${telemetryRepo}.git "${repoDir}"`);

    // Always rebase BEFORE writing
    run(`git -C "${repoDir}" pull --rebase`);

    const outDir = path.join(repoDir, "telemetry", "v1", "repos", repoName);
    fs.mkdirSync(outDir, { recursive: true });

    const outFile = path.join(outDir, `${date}.jsonl`);
    fs.appendFileSync(outFile, JSON.stringify(payload) + "\n");

    run(`git -C "${repoDir}" add "${outFile}"`);

    // Never fail telemetry on empty commits
    run(
      `git -C "${repoDir}" commit --allow-empty -m "telemetry: ${payload.event?.category || "event"}"`,
      { stdio: ["ignore", "ignore", "ignore"] }
    );

    let attempt = 0;
    while (true) {
      try {
        run(`git -C "${repoDir}" push`);
        break;
      } catch {
        attempt++;
        if (attempt >= MAX_PUSH_ATTEMPTS) {
          console.error("❌ telemetry: push failed after retries");
          process.exit(1);
        }
        sleep(BASE_BACKOFF_MS * attempt);
        run(`git -C "${repoDir}" pull --rebase`);
      }
    }
  } catch (err) {
    console.error("❌ telemetry: emission failed");
    console.error(err.stderr?.toString() || err.message);
    process.exit(1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
