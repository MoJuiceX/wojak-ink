# Night Shift Queue

This folder contains the unattended Night Shift configuration.

## Files
- `tasks.json` - Ordered task queue (editable)
- `policy.json` - Safety guardrails (branch checks, command denylist, redaction)
- `state/` - Per-run machine state (resume support)

## Task fields (summary)
- `id`, `title`, `enabled`
- `category`, `risk`, `runtime`, `mode`
- `commands` (shell commands run sequentially)
- `timeoutMs`, `retries`
- `dependsOn` (optional task IDs)
- `mutatesCode` (used for automatic downgrade to report-only mode)
- `expectedOutputs`, `doneCriteria`
- `disabledReason` (recommended for staged rollout)

## Modes
- `report`: Collect data and summarize findings
- `fix`: Shell-based changes (e.g. dependency upgrade)
- `assistant_fix`: Placeholder for AI-assisted tasks (disabled by default in Night 1)

## Editing guidance
- Keep commands idempotent when possible
- Prefer report tasks first, fix tasks second
- Add timeouts for anything that touches tests/builds
- Mark risky tasks `enabled: false` until validated in dry-run
