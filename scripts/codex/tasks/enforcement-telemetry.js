// scripts/codex/tasks/enforcement-telemetry.js
// Phase 3.2 — Enforcement Telemetry (git-based sink, canonical)

import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

export async function run(context) {
  const telemetry = context.telemetry;
  const enforcementReport = context.enforcementReport;

  if (!telemetry) {
    throw new Error("enforcement-telemetry: telemetry missing from context");
  }
  if (!telemetry.generated_at) {
    throw new Error("enforcement-telemetry: telemetry.generated_at missing");
  }

  const telemetryRepo = process.env.TELEMETRY_REPO;
  if (!telemetryRepo) {
    throw new Error(
      "enforcement-telemetry: TELEMETRY_REPO is not configured"
    );
  }

  // gh CLI auth (same requirement as prepare-repo.js)
  if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
    throw new Error(
      "enforcement-telemetry: GH_TOKEN or GITHUB_TOKEN is required"
    );
  }

  const date = telemetry.generated_at.slice(0, 10);

  // ── Build schema-v1 records ──
  const records = [];

  records.push({
    schema_version: "1.0",
    generated_at: telemetry.generated_at,
    correlation_id: telemetry.correlation_id,
    type: "enforcement.summary",
    repo: enforcementReport.repo,
    issue: enforcementReport.issue,
    actor: enforcementReport.actor,
    final_state: enforcementReport.final_state,
    checks_count: enforcementReport.checks.length,
    actions_count: enforcementReport.actions.length,
    notes: enforcementReport.notes,
  });

  for (const check of enforcementReport.checks) {
    records.push({
      schema_version: "1.0",
      generated_at: telemetry.generated_at,
      correlation_id: telemetry.correlation_id,
      type: "enforcement.check",
      repo: enforcementReport.repo,
      issue: enforcementReport.issue,
      check,
    });
  }

  for (const action of enforcementReport.actions) {
    records.push({
      schema_version: "1.0",
      generated_at: telemetry.generated_at,
      correlation_id: telemetry.correlation_id,
      type: "enforcement.action",
      repo: enforcementReport.repo,
      issue: enforcementReport.issue,
      action,
    });
  }

  const content =
    records.map(r => JSON.stringify(r)).join("\n") + "\n";

  // ── Clone telemetry repo (canonical cross-repo pattern) ──
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "codex-telemetry-")
  );

  execSync(
    `gh repo clone ${telemetryRepo} "${tmpDir}"`,
    { stdio: "inherit" }
  );

  execSync("gh auth setup-git", {
    cwd: tmpDir,
    stdio: "inherit",
  });

  execSync(
    'git config user.name "Task Assistant Bot"',
    { cwd: tmpDir }
  );

  execSync(
    'git config user.email "task-assistant-bot@users.noreply.github.com"',
    { cwd: tmpDir }
  );

  // ── Write telemetry file ──
  const telemetryFilePath = path.join(
    tmpDir,
    "enforcement-telemetry",
    "v1",
    date,
    `${telemetry.correlation_id}.jsonl`
  );

  fs.mkdirSync(path.dirname(telemetryFilePath), { recursive: true });
  fs.writeFileSync(telemetryFilePath, content, "utf8");

  // ── Commit & push ──
  execSync(`git add .`, { cwd: tmpDir, stdio: "inherit" });

  execSync(
    `git commit -m "telemetry(v1): enforcement ${enforcementReport.final_state} (${telemetry.correlation_id})"`,
    { cwd: tmpDir, stdio: "inherit" }
  );

  execSync(`git push`, { cwd: tmpDir, stdio: "inherit" });

  return {
    status: "SUCCESS",
    records_emitted: records.length,
    path: `enforcement-telemetry/v1/${date}/${telemetry.correlation_id}.jsonl`,
  };
}
