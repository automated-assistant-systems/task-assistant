#!/usr/bin/env node
/**
 * Phase 3.2 — Shared Telemetry Emit Helper
 *
 * Reads ONE telemetry record (schema v1) from STDIN
 * Writes JSONL record to telemetry repo via git + gh
 * NEVER fails the caller (logs warnings only)
 */

import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

/* ──────────────────────────────
   Utilities
   ────────────────────────────── */

function logWarn(...args) {
  console.error("⚠️ telemetry:", ...args);
}

function exitSuccess() {
  process.exit(0);
}

/* ──────────────────────────────
   Read STDIN
   ────────────────────────────── */

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", chunk => (data += chunk));
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.on("error", reject);
  });
}

/* ──────────────────────────────
   Validation
   ────────────────────────────── */

function validateTelemetry(t) {
  if (!t || typeof t !== "object") {
    throw new Error("payload is not a JSON object");
  }
  if (t.schema_version !== "1.0") {
    throw new Error("schema_version must be '1.0'");
  }
  if (!t.generated_at) {
    throw new Error("generated_at is required");
  }
  if (!t.correlation_id) {
    throw new Error("correlation_id is required");
  }
  if (!t.event?.category) {
    throw new Error("event.category is required");
  }
}

/* ──────────────────────────────
   Main
   ────────────────────────────── */

(async function main() {
  try {
    /* ── Read + parse telemetry ── */
    const raw = await readStdin();
    if (!raw) {
      throw new Error("no telemetry provided on STDIN");
    }

    const telemetry = JSON.parse(raw);
    validateTelemetry(telemetry);

    /* ── Resolve telemetry repo ── */
    const telemetryRepo = process.env.TELEMETRY_REPO;
    if (!telemetryRepo) {
      throw new Error("TELEMETRY_REPO is not set");
    }

    const branch = process.env.TELEMETRY_BRANCH || "main";
    const date = telemetry.generated_at.slice(0, 10);
    const category = telemetry.event.category;

    const relPath = path.join(
      "telemetry",
      "v1",
      category,
      date,
      `${telemetry.correlation_id}.jsonl`
    );

    /* ── Prepare temp workspace ── */
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "task-assistant-telemetry-")
    );

    /* ── Clone repo ── */
    execSync(`gh repo clone ${telemetryRepo} "${tmpDir}"`, {
      stdio: "inherit",
    });

    /* ── Wire git auth to gh ── */
    execSync("gh auth setup-git", {
      cwd: tmpDir,
      stdio: "inherit",
    });

    /* ── Git identity (scoped) ── */
    execSync('git config user.name "Task Assistant Bot"', {
      cwd: tmpDir,
    });
    execSync(
      'git config user.email "task-assistant-bot@users.noreply.github.com"',
      { cwd: tmpDir }
    );

    /* ── Write JSONL record ── */
    const fullPath = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(
      fullPath,
      JSON.stringify(telemetry) + "\n",
      "utf8"
    );

    /* ── Commit + push ── */
    execSync(`git add "${relPath}"`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    execSync(
      `git commit -m "telemetry(v1): ${category} ${telemetry.event.action || "event"} (${telemetry.correlation_id})"`,
      { cwd: tmpDir, stdio: "inherit" }
    );

    execSync(`git push origin ${branch}`, {
      cwd: tmpDir,
      stdio: "inherit",
    });
  } catch (err) {
    logWarn(err.message);
  } finally {
    // 🔒 Phase 3.2 rule: telemetry must NEVER break workflows
    exitSuccess();
  }
})();

