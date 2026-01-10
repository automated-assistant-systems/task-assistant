#!/usr/bin/env node
/**
 * Task Assistant — Telemetry Emitter (Phase 3.2 hardened)
 *
 * Guarantees:
 * - Repo-scoped telemetry ONLY (telemetry/v1/repos/<repo>/<date>.jsonl)
 * - No writes to meta
 * - Concurrency-safe push (rebase + retry)
 * - Never fails on empty commits
 * - Never fails due to missing git author identity
 */

import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

/* ──────────────────────────────
   Config
   ────────────────────────────── */

const MAX_PUSH_ATTEMPTS = 6;
const BASE_BACKOFF_MS = 800;

const BOT_NAME = process.env.TA_GIT_NAME || "task-assistant[bot]";
const BOT_EMAIL =
  process.env.TA_GIT_EMAIL || "task-assistant[bot]@users.noreply.github.com";

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
  // No payload => no-op (do not fail workflows)
  if (!raw || !raw.trim()) process.exit(0);

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    console.error("⚠️ telemetry: invalid JSON payload");
    process.exit(1);
  }

  const telemetryRepo = process.env.TELEMETRY_REPO;
  const ghToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

  if (!telemetryRepo) {
    console.error("⚠️ telemetry: TELEMETRY_REPO is not set");
    process.exit(1);
  }
  if (!ghToken) {
    console.error("⚠️ telemetry: GH_TOKEN is not set");
    process.exit(1);
  }

  const repoName = payload?.entity?.repo;
  const date = payload?.generated_at?.slice(0, 10);

  if (!repoName) {
    console.error("⚠️ telemetry: missing payload.entity.repo");
    process.exit(1);
  }
  if (!date) {
    console.error("⚠️ telemetry: missing payload.generated_at");
    process.exit(1);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "task-assistant-telemetry-"));
  const cloneDir = path.join(tmp, "telemetry-repo");

  try {
    // Clone telemetry repo using GH token
    run(
      `git clone https://x-access-token:${ghToken}@github.com/${telemetryRepo}.git "${cloneDir}"`
    );

    // Ensure commits never fail due to missing identity
    run(`git -C "${cloneDir}" config user.name "${BOT_NAME}"`);
    run(`git -C "${cloneDir}" config user.email "${BOT_EMAIL}"`);

    // Always rebase BEFORE writing to avoid creating commits on stale heads
    run(`git -C "${cloneDir}" pull --rebase`);

    // Repo-scoped path only
    const outDir = path.join(cloneDir, "telemetry", "v1", "repos", repoName);
    fs.mkdirSync(outDir, { recursive: true });

    const outFile = path.join(outDir, `${date}.jsonl`);
    fs.appendFileSync(outFile, JSON.stringify(payload) + "\n");

    run(`git -C "${cloneDir}" add "${outFile}"`);

    // Commit must never fail the workflow (allow empty + identity already set)
    // If staged becomes empty after rebase/race, allow-empty still makes it deterministic.
    const msg = `telemetry: ${payload?.event?.category || "event"}`;
    run(`git -C "${cloneDir}" commit --allow-empty -m "${msg}"`, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Push with retry, rebasing between attempts
    for (let attempt = 1; attempt <= MAX_PUSH_ATTEMPTS; attempt++) {
      try {
        run(`git -C "${cloneDir}" push`);
        process.exit(0);
      } catch (e) {
        if (attempt === MAX_PUSH_ATTEMPTS) {
          console.error("❌ telemetry: failed to push after retries");
          console.error(e?.stderr?.toString?.() || e?.message || String(e));
          process.exit(1);
        }

        // HARD RESET STRATEGY (safe for append-only logs)
        run(`git -C "${cloneDir}" fetch origin`);
        run(`git -C "${cloneDir}" reset --hard origin/main`);

        // Re-append payload
        fs.appendFileSync(outFile, JSON.stringify(payload) + "\n");
        run(`git -C "${cloneDir}" add "${outFile}"`);
        run(
          `git -C "${cloneDir}" commit --allow-empty -m "telemetry: ${payload.event?.category || "event"}"`,
          { stdio: ["ignore", "ignore", "ignore"] }
        );

        sleep(BASE_BACKOFF_MS * attempt);
      }
    }
  } catch (err) {
    console.error("❌ telemetry: emission failed");
    console.error(err?.stderr?.toString?.() || err?.message || String(err));
    process.exit(1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
