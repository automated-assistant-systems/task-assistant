/**
 * Task Assistant — Config Schema Validator
 *
 * Phase 3.3 compliant:
 * - deterministic
 * - human-readable errors
 * - no silent defaults
 */

export function validateConfig(config) {
  const errors = [];

  function fail({ path, problem, expected, fix }) {
    errors.push({ path, problem, expected, fix });
  }

  // ---- Required top-level arrays ----
  for (const key of ["tracks", "labels", "milestones"]) {
    if (!Array.isArray(config[key])) {
      fail({
        path: key,
        problem: "Value is missing or not an array.",
        expected: "An array.",
        fix: `Define '${key}' as an array in .github/task-assistant.yml.`,
      });
    }
  }

  // ---- Enforcement (optional but strict) ----
  if (config.enforcement !== undefined) {
    if (typeof config.enforcement !== "object") {
      fail({
        path: "enforcement",
        problem: "Value must be an object.",
        expected: "An object.",
        fix: "Update enforcement to be a mapping, not a scalar.",
      });
    } else {
      const excl = config.enforcement.exclusivity;

      if (excl !== undefined && typeof excl !== "object") {
        fail({
          path: "enforcement.exclusivity",
          problem: "Value must be an object.",
          expected: "An object keyed by exclusivity groups.",
          fix: "Define exclusivity groups as objects.",
        });
      }

      if (typeof excl === "object") {
        for (const [group, rules] of Object.entries(excl)) {
          if (typeof rules !== "object") {
            fail({
              path: `enforcement.exclusivity.${group}`,
              problem: "Group must be an object.",
              expected: "An object with mode / strategy / terminal.",
              fix: `Convert '${group}' to an object.`,
            });
            continue;
          }

          if (
            rules.mode &&
            !["enforce", "warn", "fail", "off"].includes(rules.mode)
          ) {
            fail({
              path: `enforcement.exclusivity.${group}.mode`,
              problem: `Invalid value '${rules.mode}'.`,
              expected: "One of: enforce, warn, fail, off.",
              fix: "Replace with a supported mode.",
            });
          }

          if (
            rules.strategy &&
            !["highest", "lowest"].includes(rules.strategy)
          ) {
            fail({
              path: `enforcement.exclusivity.${group}.strategy`,
              problem: `Invalid value '${rules.strategy}'.`,
              expected: "One of: highest, lowest.",
              fix: "Replace with a supported strategy.",
            });
          }

          if (rules.terminal && !Array.isArray(rules.terminal)) {
            fail({
              path: `enforcement.exclusivity.${group}.terminal`,
              problem: "Value must be an array.",
              expected: "An array of terminal states.",
              fix: "Convert terminal to an array.",
            });
          }
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
