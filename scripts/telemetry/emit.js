// scripts/telemetry/emit.js
#!/usr/bin/env node

import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", ...opts }).toString().trim();
}

function fatal(msg) {
  console.error(`⚠️ telemetry: ${msg}`);
  process.exit(0); // telemetry must never fail the workflow
}

// ── Read stdin ──────────────────────────────────────────────────────────────

let input = "";
process.stdin.on("data", chunk => (input += chunk));
process.stdin.on("end", () => {
  if (!input.trim()) fatal("empty telemetry payload");

  let record;
  try {
    record = JSON.parse(input);
  } catch {
    fatal("invalid JSON payload");
  }

  const telemetryRepo = process.env.TELEMETRY_REPO;
  if (!telemetryRepo) fatal("TELEMETRY_REPO is not set");

  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) fatal("GH_TOKEN is not set");

  // ── Resolve path ───────────────────────────────────────────────────────────

  const date = record.generated_at.slice(0, 10);
  const correlationId = record.correlation_id;

  const dir =
    `telemetry/v1/${record.source?.workflow || "unknown"}/${date}`;
  const filename = `${correlationId}.jsonl`;

  // ── Clone telemetry repo ───────────────────────────────────────────────────

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "task-assistant-telemetry-"));
  run(
    `git clone https://x-access-token:${token}@github.com/${telemetryRepo}.git ${tmp}`
  );

  run(`git -C ${tmp} config user.name "task-assistant[bot]"`);
  run(
    `git -C ${tmp} config user.email "task-assistant[bot]@users.noreply.github.com"`
  );

  const outDir = path.join(tmp, dir);
  fs.mkdirSync(outDir, { recursive: true });

  const filePath = path.join(outDir, filename);

  // ── Append JSONL ───────────────────────────────────────────────────────────

  const line = JSON.stringify(record) + "\n";
  fs.appendFileSync(filePath, line, "utf8");

  // ── Commit & push ──────────────────────────────────────────────────────────

  run(`git -C ${tmp} add ${dir}`);
  run(
    `git -C ${tmp} commit -m "telemetry(v1): ${record.event?.action || "event"} (${correlationId})"`
  );
  run(`git -C ${tmp} push`);
});
