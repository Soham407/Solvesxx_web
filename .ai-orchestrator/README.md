# AI Orchestrator Starter Kit

This folder turns the recovery plan into a repeatable workflow for this repo.

## What It Does

The orchestrator keeps the model stack in four lanes only:

1. Audit
2. Trace / fix
3. Test generation
4. Review

It is intentionally narrow. The goal is to stop false completion and force evidence.

## Folder Layout

```text
.ai-orchestrator/
  README.md
  roles.md
  run_supervisor.py
  tasks/queue.yaml
  prompts/
    architect/claude_audit.md
    implement/codex_fix.md
    test/gemini_test.md
    review/copilot_review.md
  outputs/
  logs/
  state/
  reports/
```

Only the files under `prompts/`, `roles.md`, `queue.yaml`, and `run_supervisor.py` are meant to be tracked.
The `outputs/`, `logs/`, `state/`, and `reports/` folders are runtime artifacts.

## Recommended First Pass

I seeded `AUTH-001` first because auth and roles gate every other workflow.
`PROC-001` is queued next so you can move straight into the procurement lane after auth is certified.

If you want to start with procurement instead, just swap the task statuses in `tasks/queue.yaml`.

## Prerequisites

- Python 3.10 or newer
- These CLI commands on your `PATH`:
  - `claude`
  - `codex`
  - `gemini`
  - `copilot`
- Optional: `PyYAML` only if you want to edit `queue.yaml` in free-form YAML instead of JSON-compatible YAML

## Quick Start

1. Install and authenticate the four CLI tools.
2. Check the task queue.
3. Run the supervisor in dry-run mode first if you want to inspect the prompts.
4. Run the supervisor normally once you are happy with the queue.
5. Review the generated outputs and the summary report before marking anything complete.

```powershell
python .ai-orchestrator/run_supervisor.py init
python .ai-orchestrator/run_supervisor.py status
python .ai-orchestrator/run_supervisor.py next
python .ai-orchestrator/run_supervisor.py run
```

Add `--prepare-only` to `run` if you want to render the prompt files without launching any external CLI.

## Swapping Tools Per Stage

If one account is capped or out of credits, you can re-route a stage without editing the queue.

Examples:

```powershell
python .ai-orchestrator/run_supervisor.py run --stage-tool codex_fix=claude
python .ai-orchestrator/run_supervisor.py run --stage-tool codex_fix=gemini --stage-tool claude_audit=gemini
```

You can also set a session-level override:

```powershell
$env:AI_ORCH_STAGE_TOOL_OVERRIDES = "codex_fix=claude"
python .ai-orchestrator/run_supervisor.py run
```

Notes:

- Valid stages: `claude_audit`, `codex_fix`, `gemini_test`, `copilot_review`, `gemini_review`
- Valid tools: `claude`, `codex`, `gemini`, `copilot`
- `AI_ORCH_CODEX_CMD`, `AI_ORCH_CLAUDE_CMD`, `AI_ORCH_GEMINI_CMD`, and `AI_ORCH_COPILOT_CMD` still work for changing the command used for a tool.

## How The Supervisor Behaves

- If all four CLIs are available, it will try to execute the full pipeline.
- If one or more CLIs are missing, it will prepare the prompts and stop before execution.
- If a stage fails, the task is marked `needs_review`.
- If the final review does not include the evidence-gate markers, the task is also marked `needs_review`.

## Evidence Gate

Each task should produce evidence for:

- changed files
- tests added or updated
- test results
- open risks
- whether the workflow is now complete

If those are missing, do not call the task certified.

## Profiles And Automatic Failover

The supervisor now supports a profile pool in `.ai-orchestrator/profiles.json`.
Each stage can list multiple profiles in priority order, and the supervisor will:

- try the first healthy profile for the stage
- classify quota, rate-limit, auth, transient, and environment failures
- cool down retryable profiles automatically
- fall through to the next configured profile
- mark the task `blocked_quota`, `blocked_auth`, or `blocked_env` if no healthy profile remains

Runtime state is stored in:

- `.ai-orchestrator/state/profiles.json` for cooldown and disable state
- `.ai-orchestrator/state/alerts.json` for queue/blocker alerts
- `.ai-orchestrator/state/current-task.json` for the most recent run snapshot

Example `profiles.json` entries in this repo now point to the local wrapper commands under `C:\Users\soham\ai-profiles\bin`.

### Typical Commands

Validate queue and profiles:

```powershell
python .ai-orchestrator/run_supervisor.py validate
```

Check queue and profile health:

```powershell
python .ai-orchestrator/run_supervisor.py status
```

Run the next queued task with automatic account failover:

```powershell
python .ai-orchestrator/run_supervisor.py run
```

Run a specific task with automatic account failover:

```powershell
python .ai-orchestrator/run_supervisor.py run --task PLANTATION-001
```

Render prompts only without launching external CLIs:

```powershell
python .ai-orchestrator/run_supervisor.py run --prepare-only --task PLANTATION-001
```

### Notes

- `--stage-tool` still works. It now remaps the selected stage to all profiles that use that tool.
- `blocked_quota` tasks become eligible again after `next_retry_at`.
- `blocked_auth` and `blocked_env` tasks stay blocked until you rerun after fixing the affected profile or environment.
