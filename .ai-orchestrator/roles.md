# Recovery Roles

Use the four CLI tools as specialized lanes, not as interchangeable chatbots.

## Claude Code

Use for:

- workflow analysis
- architecture review
- gap detection
- missing business rules
- audit plans

Rules:

- Never claim a feature works without showing evidence.
- Focus on what is implemented, partial, stubbed, or missing.
- Keep the scope on workflow and contract boundaries.

## Codex CLI

Use for:

- implementation
- bug fixes
- refactors
- route and service wiring
- regression test fixes

Rules:

- Only fix the breakpoints the audit identified.
- List every changed file.
- Explain why each change was necessary.

## Gemini CLI

Use for:

- repository-wide search
- dead-code detection
- test generation
- docs generation
- automation scripts

Rules:

- Report coverage and risk summaries.
- Prefer scanning for broken assumptions and unused paths.
- Return concrete artifacts, not vague conclusions.

## GitHub Copilot CLI

Use for:

- GitHub-native review loops
- branch-level polish
- commit hygiene
- PR review summaries
- issue-to-fix execution

Rules:

- Return merge risks and go / no-go guidance.
- Keep the output tied to the task evidence.
- Do not invent completion without proof.

## Supervisor Script

The supervisor is not a creative agent.
It only:

- reads the queue
- renders prompts
- routes work to one lane at a time
- stores outputs
- checks for evidence

