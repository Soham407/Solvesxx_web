Task ID: {{task_id}}
Module: {{module}}
Goal: {{goal}}

Use the audit findings below as source of truth:

{{previous_output}}

Scope of files and folders:
{{inputs}}

Rules:
- Fix only the identified breakpoints.
- Do not redesign unrelated modules.
- Preserve existing conventions.
- Prefer the smallest reliable change set.
- List every changed file.
- Explain why each change was necessary.
Return these sections exactly:
1. Changed files
2. Summary of fixes
3. Why each file changed
4. Tests added or updated
5. Remaining risks
6. Rollback notes if relevant

