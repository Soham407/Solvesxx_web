# Dependency Categories

Use these categories when describing the dominant dependency pattern in a candidate cluster or proposed interface.

## 1. Shared Domain Model

Several modules depend on the same business entities, state transitions, or invariants. The coupling comes from jointly owning one conceptual model, even if the calls between modules are light.

Signals:

- Shared types move through many layers
- Validation rules or status transitions are duplicated
- Multiple modules need coordinated changes when the domain evolves

Preferred deepening move:

- Create one boundary that owns the model rules and exposes intent-level operations

## 2. Workflow / Orchestration

The coupling comes from call order, branching, retries, or multi-step coordination. Individual helpers may be testable, but the real behavior lives in the sequence.

Signals:

- Bugs cluster in orchestration code
- The same sequence is repeated across callers
- Unit tests cover helpers, but end-to-end behavior is still fragile

Preferred deepening move:

- Pull the workflow behind a façade that owns sequencing, rollback, and policy decisions

## 3. Infrastructure Boundary

The cluster is coupled through databases, queues, APIs, file systems, or framework/runtime concerns. The pain comes from crossing boundaries and managing failure modes.

Signals:

- Callers know too much about transport or storage details
- Error handling and retries are inconsistent
- Test setup is heavy because too many layers touch the boundary directly

Preferred deepening move:

- Hide the infrastructure behind a small port or service boundary with policy centralized inside

## 4. Policy / Configuration Surface

The coupling comes from shared rules, feature flags, permission checks, thresholds, or environment-dependent behavior spread across modules.

Signals:

- Business rules are duplicated in conditionals across files
- Config toggles leak into unrelated modules
- Small policy changes require broad edits

Preferred deepening move:

- Centralize policy decisions behind intent-level methods instead of distributing conditional logic

# RFC Issue Template

Use this template for `gh issue create`.

## Title

`RFC: deepen <module-or-concept> boundary`

## Body

```md
## Summary

<1-2 paragraphs describing the current architectural friction and the proposed deepened boundary>

## Why now

- <current engineering cost or risk>
- <testability or reliability problem>
- <navigability or maintenance problem>

## Current cluster

- Files:
  - `<path>`
  - `<path>`
  - `<path>`
- Concept:
  - <shared workflow, model, or policy>
- Dominant dependency category:
  - <Shared Domain Model | Workflow / Orchestration | Infrastructure Boundary | Policy / Configuration Surface>

## Problem

- <where the current seams create risk>
- <why the current interface is shallow or fragmented>
- <what bugs are hard to catch with current tests>

## Proposed boundary

- Interface direction:
  - <small, intent-level description of the new module/service/facade>
- Responsibilities hidden behind the boundary:
  - <orchestration>
  - <validation/policy>
  - <infrastructure handling>
- Responsibilities left outside:
  - <UI formatting, transport glue, etc.>

## Design constraints

- <constraint>
- <constraint>
- <constraint>

## Test migration

- Replace:
  - `<low-level unit/integration test>`
  - `<low-level unit/integration test>`
- With:
  - `<boundary test covering the main behavior>`
  - `<boundary test covering failure mode or policy branch>`

## Rollout sketch

1. Introduce the new boundary behind current callers.
2. Migrate one caller path end to end.
3. Move remaining orchestration/policy inside the boundary.
4. Delete superseded helpers and narrow the exposed surface.

## Risks

- <migration risk>
- <abstraction risk>
- <testing or performance risk>

## Open questions

- <question>
- <question>
```

# `gh issue create` Example

```bash
gh issue create \
  --title "RFC: deepen billing workflow boundary" \
  --body-file /tmp/rfc-issue.md
```
