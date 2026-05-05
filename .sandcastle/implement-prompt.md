# TASK

Implement issue {{TASK_ID}}: {{ISSUE_TITLE}}

Pull in the issue with comments using `gh issue view {{TASK_ID}} --comments`. If the issue body references a parent PRD or related issue, fetch that context too.

Only work on the issue specified. Stay strictly within the brief's scope. Do not touch adjacent features.

Work on branch {{BRANCH}}. Make commits and run tests.

The repo may already be dirty with unrelated user changes. Do not ask for permission to proceed in a dirty worktree. Leave unrelated files untouched, stage only the files you changed for this issue, and keep moving.

Read `CLAUDE.md` at the repo root for repo conventions before writing code.

# CONTEXT

Here are the last 10 commits:

<recent-commits>

!`git log -n 10 --format="%H%n%ad%n%B---" --date=short`

</recent-commits>

# EXPLORATION

Explore the repo and fill your context window with relevant information that will allow you to complete the task.

Pay extra attention to test files that touch the relevant parts of the code.

# EXECUTION

If applicable, use RGR to complete the task.

1. RED: write one test
2. GREEN: write the implementation to pass that test
3. REPEAT until done
4. REFACTOR the code

# FEEDBACK LOOPS

Before committing, run `npm run typecheck` and `npm run test` if those scripts exist in package.json.
If they do not, fall back to the repo's standard typecheck/test commands.

For TypeScript projects without a `typecheck` script, run `npx tsc --noEmit` instead.

# COMMIT

Make a git commit. The commit message must:

1. Start with `RALPH:` prefix
2. Include task completed + PRD reference
3. Key decisions made
4. Files changed
5. Blockers or notes for next iteration

Keep it concise.

# THE ISSUE

If the task is not complete, leave a comment on the issue with what was done.

Do not close the issue - this will be done later.

Once complete, output <promise>COMPLETE</promise>.

# FINAL RULES

ONLY WORK ON A SINGLE TASK.
