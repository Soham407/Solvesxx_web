# FacilityPro — Antigravity Rules

## Context Files — Always Read These First
At the start of every task, read these files:
- `.ai_context/CONTEXT.md` — tech stack, 82 hooks, RBAC, conventions
- `.ai_context/SCOPE.md`   — roles, workflows, screens, API, DB schema
- `.ai_context/PHASES.md`  — what is built, mocked, or missing

## Rules
- Never create a hook without checking the 82 existing hooks in CONTEXT.md
- Never hardcode UUIDs — use service_code lookups
- Always use `formatCurrency()` for monetary values
- Always add new statuses to `src/lib/constants.ts`
- New DB tables must follow the schema in SCOPE.md section 14
- Check PHASES.md before building — it may already be built or mocked
