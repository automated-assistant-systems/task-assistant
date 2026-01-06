import { run as enforcementTelemetry } from "./enforcement-telemetry.js";
import { runTask as repoPrepare } from "./repo-prepare.js";

export const TASK_ENGINES = {
  "enforcement-telemetry": enforcementTelemetry,
  "repo.prepare": repoPrepare,
};
