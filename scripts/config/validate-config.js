/**
 * Task Assistant — Config Schema Validator
 *
 * Deterministic, dependency-free validation
 */

export function validateConfig(config) {
  const errors = [];

  function fail(msg) {
    errors.push(msg);
  }

  // Required top-level arrays
  for (const key of ["tracks", "labels", "milestones"]) {
    if (!Array.isArray(config[key])) {
      fail(`Expected '${key}' to be an array`);
    }
  }

  // Enforcement (optional)
  if (config.enforcement) {
    const excl = config.enforcement.exclusivity;
    if (typeof excl !== "object") {
      fail("enforcement.exclusivity must be an object");
    } else {
      for (const [group, rules] of Object.entries(excl)) {
        if (typeof rules !== "object") {
          fail(`exclusivity.${group} must be an object`);
          continue;
        }

        if (
          rules.mode &&
          !["enforce", "warn", "fail", "off"].includes(rules.mode)
        ) {
          fail(`Invalid exclusivity.${group}.mode: ${rules.mode}`);
        }

        if (
          rules.strategy &&
          !["highest", "lowest"].includes(rules.strategy)
        ) {
          fail(`Invalid exclusivity.${group}.strategy: ${rules.strategy}`);
        }

        if (rules.terminal && !Array.isArray(rules.terminal)) {
          fail(`exclusivity.${group}.terminal must be an array`);
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
