---
name: improve-codebase-architecture
description: Explore a codebase to find architectural improvement opportunities, especially refactors that deepen shallow modules, reduce coupling, improve testability, and make the codebase easier for AI agents to navigate. Use when the user wants architectural review, refactoring candidates, module consolidation, or issue-ready RFCs.
---

# Improve Codebase Architecture

Use this skill to explore a codebase the way an AI agent experiences it, identify architectural friction, and turn promising refactors into issue-ready RFCs.

Prefer deep modules: a small interface hiding substantial internal complexity. Favor boundaries that make behavior testable from the outside instead of pushing logic into many small helper functions that still leave integration risk in the seams.

## Step 1: Explore the codebase

Read the codebase organically. If the user explicitly asked for parallel or delegated exploration, use subagents to inspect separate areas; otherwise explore directly.

Look for friction such as:

- Understanding one concept requires bouncing across many files
- Several modules share ownership of one concept or workflow
- Interfaces are almost as complicated as their implementations
- "Pure" helper extraction made unit tests easier, but real failures still happen in orchestration
- Cross-module seams carry the most risk and are hard to test
- The most important behavior has weak or missing boundary tests

Treat that friction as the signal. Keep notes tied to concrete files, call paths, and concepts.

## Step 2: Present candidates

Present a numbered list of refactor candidates. For each candidate include:

- **Cluster**: The modules, concepts, and main files involved
- **Why they are coupled**: Shared state, shared types, call ordering, temporal coupling, duplicated policy, or co-ownership of a concept
- **Dependency category**: Classify the dominant dependency pattern using [REFERENCE.md](references/REFERENCE.md)
- **Test impact**: Which low-level tests could be replaced or simplified by stronger boundary tests

Do not propose an interface yet. End with: `Which of these would you like to explore?`

## Step 3: Wait for the user to pick one candidate

Do not continue until the user selects a candidate.

## Step 4: Frame the problem space

Before designing interfaces, explain the problem space for the chosen candidate in user-facing prose.

Include:

- Constraints the new interface must satisfy
- Dependencies it must rely on or absorb
- One rough illustrative sketch that makes the constraints concrete

The sketch is not a proposal. It is only a tool for clarifying the shape of the problem.

## Step 5: Design multiple interfaces

If the user explicitly asked for delegation or multiple agents, spawn at least 3 parallel subagents. Otherwise, produce 3 clearly different designs yourself and note that they are standalone design directions.

Each design should optimize for a different constraint:

1. Minimize the interface: aim for 1-3 entry points
2. Maximize flexibility: support extension and atypical callers
3. Optimize for the most common caller: make the default case trivial
4. If cross-boundary dependencies dominate, add a ports-and-adapters variant

For each design provide:

1. Interface signature: types, methods, parameters
2. Usage example: how callers use it
3. Hidden complexity: what moves behind the boundary
4. Dependency strategy: how dependencies are handled, using [REFERENCE.md](references/REFERENCE.md)
5. Trade-offs

Present the designs one by one, then compare them in prose. Give a recommendation. If a hybrid is strongest, say so plainly and explain why.

## Step 6: Wait for interface selection

Let the user choose a design, or accept your recommendation.

## Step 7: Create the RFC issue

Create a GitHub issue with `gh issue create` using the template in [REFERENCE.md](references/REFERENCE.md).

Rules:

- Do not ask the user to pre-review the issue body
- Fill the RFC with concrete file references, risks, and test migration notes
- If `gh` is unavailable or the repo is not authenticated, create the exact issue title and body locally in Markdown and report the blocker succinctly

## Output standard

Keep the work grounded in the current codebase:

- Cite files and call flows, not vague smells
- Prefer a few strong candidates over a long list
- Optimize for testability, maintainability, and navigability
- Be opinionated in the recommendation
