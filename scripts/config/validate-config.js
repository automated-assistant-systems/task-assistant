/**
 * Task Assistant — Config Schema Validator
 *
 * Phase 3.3
 * - Deterministic
 * - Dependency-free
 * - Error classification (core vs enforcement)
 */

export function validateConfig(config) {
  const errors = [];

  function fail(scope, message) {
    errors.push({ scope, message });
  }

  /* ──────────────────────────────
     Core required sections
     ────────────────────────────── */

  for (const key of ["tracks", "labels", "milestones"]) {
    if (!Array.isArray(config?.[key])) {
      fail(
        "core",
        `Expected '${key}' to be an array`
      );
    }
  }

  /* ──────────────────────────────
     Enforcement (optional, warn-only)
     ────────────────────────────── */

  if ("enforcement" in config) {
    const enf = config.enforcement;

    if (typeof enf !== "object" || enf === null || Array.isArray(enf)) {
      fail(
        "enforcement",
        "enforcement must be an object"
      );
    } else if (enf.exclusivity) {
      if (typeof enf.exclusivity !== "object") {
        fail(
          "enforcement",
          "enforcement.exclusivity must be an object"
        );
      } else {
        for (const [group, rules] of Object.entries(enf.exclusivity)) {
          if (typeof rules !== "object") {
            fail(
              "enforcement",
              `exclusivity.${group} must be an object`
            );
            continue;
          }

          if (
            rules.mode &&
            !["enforce", "warn", "fail", "off"].includes(rules.mode)
          ) {
            fail(
              "enforcement",
              `Invalid exclusivity.${group}.mode: ${rules.mode}`
            );
          }

          if (
            rules.strategy &&
            !["highest", "lowest"].includes(rules.strategy)
          ) {
            fail(
              "enforcement",
              `Invalid exclusivity.${group}.strategy: ${rules.strategy}`
            );
          }

          if (
            rules.terminal &&
            !Array.isArray(rules.terminal)
          ) {
            fail(
              "enforcement",
              `exclusivity.${group}.terminal must be an array`
            );
          }
        }
      }
    }
  }

  const coreErrors = errors.filter(e => e.scope === "core");
  const enforcementErrors = errors.filter(e => e.scope === "enforcement");

  return {
    ok: coreErrors.length === 0,
    coreErrors,
    enforcementErrors
  };
}
