Task ID: {{task_id}}
Module: {{module}}
Goal: {{goal}}

Based on this implementation summary:

{{previous_output}}

Scope of files and folders:
{{inputs}}

Rules:
- Run unit tests only using: npx vitest run
- Do NOT run Playwright or e2e tests — they require a running dev server which is not available here.
- Do NOT attempt to start a dev server.
- Focus on the unit test results and any import/compile errors.
- If a test file fails to compile, report the exact error.

Return these sections exactly:
1. Tests created or updated
2. Test results
3. Evidence observed
4. Uncovered risks
5. Certification score: A / B / C / D / F
6. If something failed, the exact failing boundary

