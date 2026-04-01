Task ID: {{task_id}}
Module: {{module}}
Goal: {{goal}}

Review the following implementation and test output:

{{previous_output}}

Rules:
- Focus on merge risks, evidence gaps, and workflow completeness.
- Do not repeat the implementation summary unless it affects risk.
- Return a clear go / no-go recommendation.
- Do NOT run any shell commands or write any files. This is a review-only stage.

Return these sections exactly:
1. Review summary
2. Merge risks
3. File-level concerns
4. Commit / PR summary
5. Go / no-go recommendation
6. Missing evidence gate items

