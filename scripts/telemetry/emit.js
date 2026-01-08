#!/usr/bin/env node
/**
 * Shared Telemetry Emitter
 *
 * - Reads JSON from stdin (single object or JSONL stream)
 * - Appends records to a repo-scoped or meta-scoped JSONL file
 * - Writes ONLY to telemetry repo
 * - No local telemetry artifacts
 */

import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

/* ──────────────────────────────
   Helpers
   ────────────────────────────── */

function run(cmd, opts = {}) {
  return execSync(cmd, {
    stdio: "pipe",
    env: {
      ...process.env,
      ...(opts.env || {}),
    },
  }).toString().trim();
}

function fail(msg) {
  console.error(`⚠️ telemetry: ${msg}`);
  process.exit(0); // non-fatal by design
}

/* ──────────────────────────────
   Read stdin
   ────────────────────────────── */

const input = fs.readFileSync(0, "utf8").trim();
if (!input) fail("empty telemetry payload");

const records = input
  .split("\n")
  .map(line => line.trim())
  .filter(Boolean)
  .map(line => {
    try {
      return JSON.parse(line);
    } catch {
      fail("invalid JSON input");
    }
  });

/* ──────────────────────────────
   Environment
   ────────────────────────────── */

const telemetryRepo = process.env.TELEMETRY_REPO;
if (!telemetryRepo) fail("TELEMETRY_REPO is not set");

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) fail("GH_TOKEN is required");

/* ──────────────────────────────
   Clone telemetry repo
   ────────────────────────────── */

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "task-assistant-telemetry-")
);

run(`gh repo clone ${telemetryRepo} "${tmp}"`, {
  env: { ...process.env, GH_TOKEN: token },
});

run(`git -C "${tmp}" config user.name "task-assistant[bot]"`);
run(
  `git -C "${tmp}" config user.email "task-assistant[bot]@users.noreply.github.com"`
);

/* ──────────────────────────────
   Write records
   ────────────────────────────── */

for (const record of records) {
  if (!record.generated_at || !record.entity?.type) {
    fail("missing required telemetry fields");
  }

  const date = record.generated_at.slice(0, 10);

  let outDir;
  if (record.entity.type === "repository") {
    const repo = record.entity.repo;
    if (!repo) fail("entity.repo missing for repository telemetry");
    outDir = path.join("telemetry", "v1", "repos", repo);
  } else {
    outDir = path.join("telemetry", "v1", "meta");
  }

  fs.mkdirSync(path.join(tmp, outDir), { recursive: true });

  const file = path.join(tmp, outDir, `${date}.jsonl`);
  fs.appendFileSync(file, JSON.stringify(record) + "\n");
}

/* ──────────────────────────────
   Commit & push
   ────────────────────────────── */

run(`git -C "${tmp}" add .`);
run(
  `git -C "${tmp}" commit -m "telemetry(v1): emit ${records.length} record(s)" || true`
);
run(
  `git -C "${tmp}" -c http.extraheader="AUTHORIZATION: bearer ${token}" push`
);
