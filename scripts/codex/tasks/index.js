import { run as enforcementTelemetry } from "./enforcement-telemetry.js";
import { runTask as repoPrepare } from "./repo-prepare.js";

export const USER_TASKS = {
  "repo.prepare": repoPrepare,
};

export const INTERNAL_TASKS = {
  "enforcement-telemetry": enforcementTelemetry,
};
