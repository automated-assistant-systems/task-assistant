2️⃣ Telemetry Conformance Matrix (Phase 3.1)

This matrix inventories all Task Assistant workflows and their telemetry status relative to the new canonical schema.

Legend

✅ = Conformant

⚠️ = Partial / legacy

❌ = Missing / non-conformant

Core Workflows
Workflow	Emits Telemetry	Telemetry Repo	Schema v1.0	Status
prepare-repo	✅	✅	✅	DONE (Reference)
codex.execute	⚠️	✅	⚠️	Needs cleanup
label reconciliation (legacy)	❌	❌	❌	Needs refactor
milestone enforcement	❌	❌	❌	Needs refactor
config validation (outside prepare-repo)	❌	❌	❌	Needs consolidation
Dashboard & Telemetry Pipelines
Workflow	Emits Telemetry	Telemetry Repo	Schema v1.0	Status
telemetry merge	⚠️	⚠️	❌	Needs alignment
dashboard build	❌	❌	❌	Needs implementation
diagnostics	❌	❌	❌	Not started
Codex Task Engines
Task Engine	Emits Telemetry	Via prepare-repo pattern	Status
repo-prepare	✅	✅	DONE
future task engines	❌	❌	Pending
Global Assessment

Canonical telemetry pattern exists ✅

Telemetry isolation proven ✅

No local telemetry writes required ✅

All other workflows are legacy or incomplete ❌

This is exactly the expected outcome at the end of Phase 3.1.
