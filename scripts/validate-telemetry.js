#!/usr/bin/env node

/**
 * Task Assistant Telemetry Validator (v1.0)
 *
 * Enforces:
 * - Storage layout contract
 * - Schema envelope integrity
 * - Enum validation
 * - Path ↔ entity alignment
 * - Correlation integrity
 * - One-record-per-file rule
 *
 * Strict mode by default.
 */

/**
 * Task Assistant Telemetry Validator (ESM)
 */

import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = process.env.TELEMETRY_ROOT
  ? path.join(process.cwd(), process.env.TELEMETRY_ROOT)
  : path.join(process.cwd(), "telemetry", "v1", "repos");

const ALLOWED_ACTIONS = new Set(["success", "failure"]);
const ALLOWED_CHECK_OUTCOMES = new Set(["PASS", "WARN", "FAIL"]);

let errors = [];

function fail(file, message) {
  errors.push(`[ERROR] ${file}\n  - ${message}`);
}

function validateRoot() {
  if (!fs.existsSync(ROOT)) {
    console.error(`Telemetry root not found: ${ROOT}`);
    console.error(`Set TELEMETRY_ROOT environment variable to your telemetry repo path.`);
    process.exit(1);
  }
}

function isValidDateFolder(name) {
  return /^\d{4}-\d{2}-\d{2}$/.test(name);
}

function validateJsonFile(filePath, repoName, dateFolder, correlationFolder) {
  const content = fs.readFileSync(filePath, "utf8").trim();

  let record;
  try {
    record = JSON.parse(content);
  } catch {
    fail(filePath, "Invalid JSON or multiple JSON objects.");
    return;
  }

  if (Array.isArray(record)) {
    fail(filePath, "File must contain a single JSON object.");
    return;
  }

  const requiredFields = [
    "schema_version",
    "generated_at",
    "correlation_id",
    "source",
    "entity",
    "event",
    "details"
  ];

  for (const field of requiredFields) {
    if (!(field in record)) {
      fail(filePath, `Missing required field: ${field}`);
    }
  }

  if (!record.source?.workflow || !record.source?.job) {
    fail(filePath, "Missing source.workflow or source.job");
  }

  if (!record.entity?.type || !record.entity?.owner || !record.entity?.repo) {
    fail(filePath, "Missing entity.type/owner/repo");
  }

  if (!record.event?.category || !record.event?.action || !("reason" in record.event)) {
    fail(filePath, "Missing event.category/action/reason");
  }

  if (typeof record.details !== "object") {
    fail(filePath, "details must be an object");
  }

  if (!ALLOWED_ACTIONS.has(record.event?.action)) {
    fail(filePath, `Invalid event.action: ${record.event?.action}`);
  }

  if (record.details?.checks) {
    for (const check of record.details.checks) {
      if (!ALLOWED_CHECK_OUTCOMES.has(check.outcome)) {
        fail(filePath, `Invalid check.outcome: ${check.outcome}`);
      }
    }
  }

  // Date match
  try {
    const date = new Date(record.generated_at);
    const utcDate = date.toISOString().slice(0, 10);
    if (utcDate !== dateFolder) {
      fail(filePath, `Date mismatch: folder=${dateFolder}, generated_at=${utcDate}`);
    }
  } catch {
    fail(filePath, "Invalid generated_at timestamp");
  }

  // Correlation match
  if (record.correlation_id !== correlationFolder) {
    fail(filePath, `Correlation mismatch: folder=${correlationFolder}, record=${record.correlation_id}`);
  }

  // Filename ↔ category
  const expectedFile = `${record.event.category}.json`;
  if (path.basename(filePath) !== expectedFile) {
    fail(filePath, `Filename must match event.category (${expectedFile})`);
  }

  // Repo path ↔ entity
  if (record.entity.repo !== repoName) {
    fail(filePath, `Repo mismatch: path=${repoName}, entity.repo=${record.entity.repo}`);
  }

  // Nested event collision
  if ("event" in record.details) {
    fail(filePath, "details.event is not allowed (use details.issue_event)");
  }

  // Duplicate repo drift
  if (record.details?.repo) {
    if (!record.details.repo.endsWith(record.entity.repo)) {
      fail(filePath, "details.repo does not align with entity.repo");
    }
  }
}

function walk() {
  const repos = fs.readdirSync(ROOT);

  for (const repoName of repos) {
    const repoPath = path.join(ROOT, repoName);
    if (!fs.statSync(repoPath).isDirectory()) continue;

    const dateFolders = fs.readdirSync(repoPath);

    for (const dateFolder of dateFolders) {
      if (!isValidDateFolder(dateFolder)) {
        fail(repoPath, `Invalid date folder: ${dateFolder}`);
        continue;
      }

      const datePath = path.join(repoPath, dateFolder);
      const correlations = fs.readdirSync(datePath);

      for (const correlationFolder of correlations) {
        const corrPath = path.join(datePath, correlationFolder);
        if (!fs.statSync(corrPath).isDirectory()) continue;

        const files = fs.readdirSync(corrPath);

        if (files.length === 0) {
          fail(corrPath, "Empty correlation directory");
          continue;
        }

        for (const file of files) {
          if (file.startsWith(".")) {
            continue;
          }

          if (!file.endsWith(".json")) {
            fail(corrPath, `Non-JSON file found: ${file}`);
            continue;
          }

          validateJsonFile(
            path.join(corrPath, file),
            repoName,
            dateFolder,
            correlationFolder
          );
        }
      }
    }
  }
}

function main() {
  validateRoot();
  walk();

  if (errors.length > 0) {
    console.error(errors.join("\n\n"));
    console.error(`\nValidation failed with ${errors.length} error(s).`);
    process.exit(1);
  } else {
    console.log("Telemetry validation passed.");
    process.exit(0);
  }
}

main();
