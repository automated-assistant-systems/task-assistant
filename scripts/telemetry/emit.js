#!/usr/bin/env node
/**
 * Task Assistant — Telemetry Emit Helper (v1)
 *
 * Contract:
 * - Reads ONE JSON object from stdin (single telemetry event)
 * - Appends it to the telemetry repo under:
 *     telemetry/v1/repos/<repo>/<YYYY-MM-DD>.jsonl
 * - Never writes to meta paths
 * - Uses the proven cross-repo pattern:
 *     gh repo clone -> append -> git commit -> git push
 *
 * Required env:
 * - TELEMETRY_REPO = "owner/repo" (org var)
 * - GH_TOKEN or GITHUB_TOKEN (GitHub App token preferred)
 *
 * Optional env:
 * - TELEMETRY_BRANCH (default "main")
 */

import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

function run(cmd, options = {}) {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  }).trim();
}

function readStdin() {
  return new Promise(resolve => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

function isoDateUTC(d) {
  // Accept ISO string or Date-ish; fallback to now.
  const dt = d ? new Date(d) : new Date();
  if (Number.isNaN(dt.getTime())) return new Date().toISOString().slice(0, 10);
  return dt.toISOString().slice(0, 10);
}

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`telemetry: ${name} is not set`);
  return v;
}

function parseTelemetryRepo(slug) {
  const [owner, repo] = String(slug).split("/");
  if (!owner || !repo) {
    throw new Error(`telemetry: invalid TELEMETRY_REPO value: ${slug}`);
  }
  return { owner, repo };
}

function safeRepoNameFromPayload(payload) {
  // Prefer entity.repo; fall back to GITHUB_REPOSITORY ("owner/repo").
  const entityRepo = payload?.entity?.repo;
  if (typeof entityRepo === "string" && entityRepo.trim()) {
    // entity.repo might be "task-assistant" or "owner/repo" depending on caller.
    const parts = entityRepo.split("/");
    return parts.length === 2 ? parts[1] : entityRepo;
  }
  const ghRepo = process.env.GITHUB_REPOSITORY;
  if (ghRepo) return ghRepo.split("/")[1] || ghRepo;
  throw new Error("telemetry: cannot determine repo name for path");
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("telemetry: invalid JSON input");
  }
  if (!payload.schema_version) {
    throw new Error("telemetry: schema_version is required");
  }
  if (!payload.generated_at) {
    throw new Error("telemetry: generated_at is required");
  }
  if (!payload.correlation_id) {
    throw new Error("telemetry: correlation_id is required");
  }
  if (!payload.source?.workflow || !payload.source?.job || !payload.source?.run_id) {
    throw new Error("telemetry: source.workflow/job/run_id are required");
  }
  if (!payload.entity?.type) {
    throw new Error("telemetry: entity.type is required");
  }
  if (!payload.event?.category || !payload.event?.action) {
    throw new Error("telemetry: event.category and event.action are required");
  }
}

async function main() {
  const TELEMETRY_REPO = requiredEnv("TELEMETRY_REPO");
  const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!TOKEN) throw new Error("telemetry: GH_TOKEN or GITHUB_TOKEN is required");

  const branch = process.env.TELEMETRY_BRANCH || "main";
  const { owner, repo: telemetryRepoName } = parseTelemetryRepo(TELEMETRY_REPO);

  const stdin = (await readStdin()).trim();
  if (!stdin) {
    throw new Error("telemetry: empty telemetry payload");
  }

  let payload;
  try {
    payload = JSON.parse(stdin);
  } catch {
    throw new Error("telemetry: invalid JSON input");
  }

  validatePayload(payload);

  // Enforce: never write to meta from repo workflows.
  // All writers go into repos/<repo>/YYYY-MM-DD.jsonl
  const repoName = safeRepoNameFromPayload(payload);
  const date = isoDateUTC(payload.generated_at);

  const telemetryRelPath = path.posix.join(
    "telemetry",
    "v1",
    "repos",
    repoName,
    `${date}.jsonl`
  );

  // Clone via gh (proven) with explicit token env.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "task-assistant-telemetry-"));

  run(`gh repo clone ${owner}/${telemetryRepoName} "${tmp}"`, {
    env: { ...process.env, GH_TOKEN: TOKEN },
  });

  // Ensure branch checked out (repo default should already be main, but be explicit)
  try {
    run(`git -C "${tmp}" checkout ${branch}`);
  } catch {
    // If branch doesn't exist locally yet, fetch and checkout
    run(`git -C "${tmp}" fetch origin ${branch}:${branch}`);
    run(`git -C "${tmp}" checkout ${branch}`);
  }

  // Ensure dirs exist
  const outFile = path.join(tmp, telemetryRelPath);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  // Append ONE record line
  fs.appendFileSync(outFile, JSON.stringify(payload) + "\n", "utf8");

  // Commit + push using the same token context
  run(`git -C "${tmp}" config user.name "task-assistant[bot]"`);
  run(`git -C "${tmp}" config user.email "task-assistant[bot]@users.noreply.github.com"`);

  run(`git -C "${tmp}" add "${telemetryRelPath}"`);

  const msg =
    `telemetry(v1): ${payload.event.category} ${payload.event.action} ` +
    `(${payload.correlation_id})`;

  // Commit may be no-op if identical line somehow already present (rare)
  try {
    run(`git -C "${tmp}" commit -m "${msg}"`);
  } catch (err) {
    // If nothing to commit, exit cleanly
    const s = String(err?.message || "");
    if (s.includes("nothing to commit") || s.includes("no changes added")) {
      process.exit(0);
    }
    throw err;
  }

  // Ensure git uses GH_TOKEN for HTTPS pushes (cross-repo)
  run(
    `git -C "${tmp}" config http.https://github.com/.extraheader "AUTHORIZATION: bearer ${TOKEN}"`
  );
  run(`git -C "${tmp}" push origin ${branch}`);
}

main().catch(err => {
  // IMPORTANT: emit.js should not crash workflows by default.
  // Caller decides whether to treat telemetry as fatal.
  console.error(`⚠️ telemetry: ${err.message}`);
  process.exit(0);
});
