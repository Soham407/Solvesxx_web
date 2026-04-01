You are auditing an existing enterprise codebase.

Task ID: {{task_id}}
Module: {{module}}
Goal: {{goal}}

Scope of files and folders:
{{inputs}}

Rules:
- Do not rewrite the system.
- Do not assume undocumented behavior.
- Report only what you can support from the code and tests.
- Focus on workflow and contract boundaries, not line-by-line style.

Return these sections exactly:
1. Summary
2. Implemented
3. Partial
4. Stubbed or fake
5. Missing
6. High-risk workflow breaks
7. Suspicious files
8. Evidence needed to certify this module
9. Recommended next fix

