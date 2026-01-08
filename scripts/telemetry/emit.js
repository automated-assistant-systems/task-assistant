#!/usr/bin/env node
/**
 * scripts/telemetry/emit.js
 *
 * Task Assistant Telemetry Emitter
 *
 * HARD INVARIANT:
 * - Task Assistant MUST ONLY emit repo-scoped telemetry
 * - Meta telemetry is NOT allowed from this emitter
 */

import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

/* ──────────────────────────────
   Utilities
   ────────────────────────────── */

function run(cmd, opts = {}) {
  return execSync(cmd, {
    stdio: "pipe",
    encoding: "utf8",
    ...opts
  }).trim();
}

function die(msg) {
  console.error(`⚠️ telemetry: ${msg}`);
  process.exit(0); // non-fatal by design
}

/* ──────────────────────────────
   Read + validate input
   ────────────────────────────── */

let payload;
try {
  const input = fs.readFileSync(0, "utf8").trim();
  if (!input) die("empty telemetry payload");
  payload = JSON.parse(input);
} catch {
  die("invalid JSON input");
}

/* ──────────────────────────────
   Enforce repo-only invariant
   ────────────────────────────── */

const repo =
  payload?.entity?.repo;

if (!repo || typeof repo !== "string") {
  die("entity.repo is required — meta telemetry is forbidden");
}

if (repo.includes("/")) {
  // guard against accidental owner/repo misuse
  die("entity.repo must be repo name only (no owner)");
}

/* ──────────────────────────────
   Required env
   ────────────────────────────── */

const TELEMETRY_REPO = process.env.TELEMETRY_REPO;
const GH_TOKEN = process.env.GH_TOKEN;

if (!TELEMETRY_REPO) {
  die("TELEMETRY_REPO is not set");
}
if (!GH_TOKEN) {
  die("GH_TOKEN is not set");
}

/* ──────────────────────────────
   Path resolution (repo-only)
   ────────────────────────────── */

const date =
  (payload.generated_at || new Date().toISOString()).slice(0, 10);

const telemetryPath =
  `telemetry/v1/repos/${repo}/${date}.jsonl`;

/* ──────────────────────────────
   Write via temp clone (proven pattern)
   ────────────────────────────── */

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "task-assistant-telemetry-")
);

try {
  run(
    `git clone https://github.com/${TELEMETRY_REPO}.git "${tmp}"`,
    {
      env: {
        ...process.env,
        GIT_ASKPASS: "echo",
        GIT_TERMINAL_PROMPT: "0"
      }
    }
  );

  run(`git -C "${tmp}" config user.name "task-assistant[bot]"`);
  run(
    `git -C "${tmp}" config user.email "task-assistant[bot]@users.noreply.github.com"`
  );

  const outFile = path.join(tmp, telemetryPath);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  fs.appendFileSync(
    outFile,
    JSON.stringify(payload) + "\n"
  );

  run(`git -C "${tmp}" add "${telemetryPath}"`);
  run(
    `git -C "${tmp}" commit -m "telemetry(v1): ${payload.event?.category || "event"}"`
  );

  run(
    `git -C "${tmp}" -c http.extraheader="AUTHORIZATION: bearer ${GH_TOKEN}" push`
  );
} catch (err) {
  die(err.message);
}
