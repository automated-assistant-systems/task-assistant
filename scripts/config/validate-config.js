#!/usr/bin/env node
/**
 * Task Assistant — Config Schema Validator (Authoritative v1)
 *
 * Phase: 3.4
 * Guarantees:
 * - Deterministic
 * - Schema-driven
 * - Clear BLOCK vs WARN separation
 * - No side effects
 */

import fs from "fs";
import yaml from "yaml";

/* ──────────────────────────────
   Core validator (library mode)
   ────────────────────────────── */

export function validateConfig(config) {
  const coreErrors = [];
  const enforcementErrors = [];

  function coreFail(message) {
    coreErrors.push(message);
  }

  function enforcementFail(message) {
    enforcementErrors.push(message);
  }

  if (!config || typeof config !== "object") {
    coreFail("Configuration must be a YAML object");
    return result();
  }

  if (typeof config.schema_version !== "string") {
    coreFail("schema_version is required and must be a string");
  } else if (!config.schema_version.startsWith("1.")) {
    coreFail(`Unsupported schema_version: ${config.schema_version}`);
  }

  for (const key of ["tracks", "labels", "milestones"]) {
    if (!Array.isArray(config[key])) {
      coreFail(`Expected '${key}' to be an array`);
    }
  }

  if (Array.isArray(config.tracks)) {
    const ids = new Set();
    for (const t of config.tracks) {
      if (!t || typeof t !== "object") {
        coreFail("Each track must be an object");
        continue;
      }
      if (!t.id || typeof t.id !== "string") {
        coreFail("Track.id is required and must be a string");
      } else if (ids.has(t.id)) {
        coreFail(`Duplicate track.id: ${t.id}`);
      } else {
        ids.add(t.id);
      }
      if (!t.label || typeof t.label !== "string") {
        coreFail(`Track '${t.id || "unknown"}' missing valid label`);
      }
    }
  }

  if (Array.isArray(config.labels)) {
    for (const l of config.labels) {
      if (!l || typeof l !== "object") {
        coreFail("Each label must be an object");
        continue;
      }
      if (!l.name || typeof l.name !== "string") {
        coreFail("Label.name is required and must be a string");
      }
      if (l.color && typeof l.color !== "string") {
        coreFail(`Label '${l.name}' color must be a string`);
      }
      if (l.description && typeof l.description !== "string") {
        coreFail(`Label '${l.name}' description must be a string`);
      }
    }
  }

  if (Array.isArray(config.milestones)) {
    for (const m of config.milestones) {
      if (!m || typeof m !== "object") {
        coreFail("Each milestone must be an object");
        continue;
      }
      if (!m.title || typeof m.title !== "string") {
        coreFail("Milestone.title is required and must be a string");
      }
    }
  }

  if ("enforcement" in config) {
    const enf = config.enforcement;
    if (typeof enf !== "object" || enf === null || Array.isArray(enf)) {
      enforcementFail("enforcement must be an object");
    }
  }

  return result();

  function result() {
    return {
      ok: coreErrors.length === 0,
      coreErrors,
      enforcementErrors,
    };
  }
}

/* ──────────────────────────────
   Engine / CLI mode
   ────────────────────────────── */

if (import.meta.url === `file://${process.argv[1]}`) {
  let config;
  let raw;

  const result = {
    tool: "validate-config",
    version: "1.0",
    ok: false,
    summary: "",
    checks: [],
  };

  try {
    raw = fs.readFileSync(".github/task-assistant.yml", "utf8");
    config = yaml.parse(raw);
    result.checks.push({ id: "config.load", outcome: "PASS" });
  } catch (err) {
    result.checks.push({
      id: "config.load",
      outcome: "FAIL",
      details: err.message,
    });
    result.summary = "Configuration file missing or invalid";
    console.log(JSON.stringify(result));
    process.exit(1);
  }

  const validation = validateConfig(config);

  for (const msg of validation.coreErrors) {
    result.checks.push({
      id: "config.core",
      outcome: "FAIL",
      details: msg,
    });
  }

  for (const msg of validation.enforcementErrors) {
    result.checks.push({
      id: "config.enforcement",
      outcome: "WARN",
      details: msg,
    });
  }

  result.ok = validation.coreErrors.length === 0;
  result.summary = result.ok
    ? "Configuration is valid"
    : "Configuration is invalid";

  console.log(JSON.stringify(result));
  process.exit(result.ok ? 0 : 1);
}
