// tasks/enforcement-telemetry.js
// Phase 3.2 — Hygiene & Enforcement
// Purpose: emit telemetry schema v1 records for enforcement outcomes (no enforcement logic here)

import crypto from "crypto";

/**
 * EXPECTED inputs (provided by supervisor/run.js):
 * - context.telemetry: { correlation_id, generated_at, schema_version: "1.0", emitter_version, ... }
 * - context.enforcementReport:
 *   {
 *     repo: { owner, repo },
 *     issue: { number },
 *     actor: { login },
 *     final_state: "SUCCESS"|"PARTIAL"|"BLOCKED"|"FAILED",
 *     checks: [{ id, outcome, evidence?, details? }],
 *     actions: [{ type, target, before?, after?, reason?, details? }],
 *     notes?: string[]
 *   }
 *
 * REQUIRED env:
 * - TELEMETRY_REPO: "owner/name"
 * - TELEMETRY_BRANCH: "main" (default)
 * - TELEMETRY_BASE_PATH: "enforcement-telemetry/v1" (default)
 */

import { buildTelemetryRecordV1, validateTelemetryRecordV1 } from "../telemetry/schema-v1.js";

export const id = "enforcement-telemetry";
export const version = "1.0.0";

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing required env: ${name}`);
  return v.trim();
}

function getEnv(name, fallback) {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
}

function toDateFolder(iso) {
  // iso like "2026-01-05T02:03:04.000Z" -> "2026-01-05"
  return String(iso).slice(0, 10);
}

function stableJson(obj) {
  // Deterministic JSON stringify (stable key order)
  const allKeys = new Set();
  JSON.stringify(obj, (k, v) => (allKeys.add(k), v));
  return JSON.stringify(obj, Array.from(allKeys).sort(), 2);
}

function jsonl(records) {
  // each record on one line, stable JSON per line
  return records.map(r => stableJson(r)).join("\n") + "\n";
}

async function writeTelemetryFile({ octokit, telemetryRepo, branch, path, content, commitMessage }) {
  const [owner, repo] = telemetryRepo.split("/");
  const encoded = Buffer.from(content, "utf8").toString("base64");

  // Create unique file each run (no need to read/append)
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: commitMessage,
    content: encoded,
    branch,
  });
}

export async function run(context) {
  const { octokit, telemetry, enforcementReport } = context;

  if (!octokit) throw new Error("enforcement-telemetry: missing octokit");
  if (!telemetry) throw new Error("enforcement-telemetry: missing telemetry context");
  if (!enforcementReport) throw new Error("enforcement-telemetry: missing enforcementReport");

  const telemetryRepo = mustGetEnv("TELEMETRY_REPO");
  const branch = getEnv("TELEMETRY_BRANCH", "main");
  const basePath = getEnv("TELEMETRY_BASE_PATH", "enforcement-telemetry/v1");

  // Build records (schema v1 only)
  const records = [];

  // 1) Summary record
  records.push(buildTelemetryRecordV1("enforcement.summary", {
    correlation_id: telemetry.correlation_id,
    generated_at: telemetry.generated_at,
    repo: enforcementReport.repo,
    issue: enforcementReport.issue,
    actor: enforcementReport.actor,
    final_state: enforcementReport.final_state,
    checks_count: enforcementReport.checks?.length ?? 0,
    actions_count: enforcementReport.actions?.length ?? 0,
    notes: enforcementReport.notes ?? [],
  }));

  // 2) Check records
  for (const c of (enforcementReport.checks ?? [])) {
    records.push(buildTelemetryRecordV1("enforcement.check", {
      correlation_id: telemetry.correlation_id,
      generated_at: telemetry.generated_at,
      repo: enforcementReport.repo,
      issue: enforcementReport.issue,
      check: {
        id: c.id,
        outcome: c.outcome,
        evidence: c.evidence ?? null,
        details: c.details ?? null,
      },
    }));
  }

  // 3) Action records
  for (const a of (enforcementReport.actions ?? [])) {
    records.push(buildTelemetryRecordV1("enforcement.action", {
      correlation_id: telemetry.correlation_id,
      generated_at: telemetry.generated_at,
      repo: enforcementReport.repo,
      issue: enforcementReport.issue,
      action: {
        type: a.type,
        target: a.target,
        before: a.before ?? null,
        after: a.after ?? null,
        reason: a.reason ?? null,
        details: a.details ?? null,
      },
    }));
  }

  // Validate schema v1 strictly
  for (const r of records) validateTelemetryRecordV1(r);

  // Deterministic path
  const dateFolder = toDateFolder(telemetry.generated_at);
  const fileName = `${telemetry.correlation_id}.jsonl`;
  const fullPath = `${basePath}/${dateFolder}/${fileName}`;

  const content = jsonl(records);

  // Deterministic commit message
  const commitMessage =
    `telemetry(v1): enforcement ${enforcementReport.repo.owner}/${enforcementReport.repo.repo}#${enforcementReport.issue.number} ` +
    `[${enforcementReport.final_state}] (${telemetry.correlation_id})`;

  await writeTelemetryFile({
    octokit,
    telemetryRepo,
    branch,
    path: fullPath,
    content,
    commitMessage,
  });

  return {
    status: "SUCCESS",
    emitted_records: records.length,
    telemetry_path: fullPath,
  };
}
