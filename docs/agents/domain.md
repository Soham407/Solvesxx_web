# Domain Docs

This repo is **multi-context**.

## Layout

- Root `CONTEXT-MAP.md` points to the active context file
- Active context currently lives at `.ai_context/CONTEXT.md`
- Status and module coverage live in `.ai_context/PHASES.md`
- Session continuity notes live in `.ai_context/STATE.md`

## Reading Rules

- Read `CONTEXT-MAP.md` first.
- Then read the active context file it points to.
- Use `PHASES.md` for module status before making architecture changes.
- Use `STATE.md` for recent session history and active decisions.

## ADRs

- Store architecture decision records under `docs/adr/` if they are added later.
- If a decision changes the shape of the app, record it so future reviews do not re-litigate the same choice.
