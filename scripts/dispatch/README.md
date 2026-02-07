Dispatcher scripts trigger Task Assistant engines via
task-assistant-dispatch.yml.

All dispatcher scripts:
- operate on a single repository
- rely on dispatcher-generated correlation IDs
- never emit telemetry directly
