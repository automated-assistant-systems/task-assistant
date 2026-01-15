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

export function validateConfig(config) {
  const coreErrors = [];
  const enforcementErrors = [];

  function coreFail(message) {
    coreErrors.push(message);
  }

  function enforcementFail(message) {
    enforcementErrors.push(message);
  }

  /* ──────────────────────────────
     Schema Version (REQUIRED)
     ────────────────────────────── */

  if (!config || typeof config !== "object") {
    coreFail("Configuration must be a YAML object");
    return result();
  }

  if (typeof config.schema_version !== "string") {
    coreFail("schema_version is required and must be a string");
  } else if (!config.schema_version.startsWith("1.")) {
    coreFail(`Unsupported schema_version: ${config.schema_version}`);
  }

  /* ──────────────────────────────
     Required Top-Level Arrays
     ────────────────────────────── */

  for (const key of ["tracks", "labels", "milestones"]) {
    if (!Array.isArray(config[key])) {
      coreFail(`Expected '${key}' to be an array`);
    }
  }

  /* ──────────────────────────────
     Tracks
     ────────────────────────────── */

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

  /* ──────────────────────────────
     Labels
     ────────────────────────────── */

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

  /* ──────────────────────────────
     Milestones
     ────────────────────────────── */

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

  /* ──────────────────────────────
     Enforcement (OPTIONAL but VALIDATED)
     ────────────────────────────── */

  if ("enforcement" in config) {
    const enf = config.enforcement;

    if (typeof enf !== "object" || enf === null || Array.isArray(enf)) {
      enforcementFail("enforcement must be an object");
    } else if ("exclusivity" in enf) {
      if (
        typeof enf.exclusivity !== "object" ||
        enf.exclusivity === null ||
        Array.isArray(enf.exclusivity)
      ) {
        enforcementFail("enforcement.exclusivity must be an object");
      } else {
        for (const [group, rules] of Object.entries(enf.exclusivity)) {
          if (typeof rules !== "object" || rules === null) {
            enforcementFail(`exclusivity.${group} must be an object`);
            continue;
          }

          if (
            rules.mode &&
            !["enforce", "warn", "fail", "off"].includes(rules.mode)
          ) {
            enforcementFail(
              `Invalid exclusivity.${group}.mode: ${rules.mode}`
            );
          }

          if (
            rules.strategy &&
            !["highest", "lowest"].includes(rules.strategy)
          ) {
            enforcementFail(
              `Invalid exclusivity.${group}.strategy: ${rules.strategy}`
            );
          }

          if (
            rules.terminal &&
            !Array.isArray(rules.terminal)
          ) {
            enforcementFail(
              `exclusivity.${group}.terminal must be an array`
            );
          }
        }
      }
    }
  }

  /* ──────────────────────────────
     Result
     ────────────────────────────── */

  return result();

  function result() {
    return {
      ok: coreErrors.length === 0,
      coreErrors,
      enforcementErrors,
    };
  }
}
