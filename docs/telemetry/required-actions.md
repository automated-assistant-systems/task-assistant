Required Actions (Event Names) for v1

These are the canonical action strings you should standardize on immediately:

Config + prepare-repo

config.load

config.validate

repo.prepare.labels.reconcile

repo.prepare.milestones.reconcile

repo.prepare.complete

Codex supervisor/runner

codex.supervisor.dispatch

codex.execute

codex.task.run

codex.pr.create

codex.complete

Telemetry plumbing

telemetry.write

telemetry.write.failed
