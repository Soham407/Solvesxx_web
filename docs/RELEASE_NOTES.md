# Release Notes

## 2026-04-07

### PRD Closure Wave (PR #8)

- Implemented PRD workflow truth fixes for HRMS documents, recruitment conversion user-linking, technician evidence/PPE persistence, and buyer invoice payment/feedback paths.
- Hardened E2E coverage and harness behavior across buyer, procurement, wave-2 workflow chains, and managed test app startup in worktree environments.
- Added dedicated Printing & Advertising workflow verification (`e2e/printing-advertising.spec.ts`).
- Updated contract tests for finance and HRMS truth rules.
- Added PRD closure execution artifacts:
  - `PRD_CLOSURE_PLAN.md`
  - `docs/PRD_GAP_REGISTER.md`

### Verification Evidence

- `npm run type-check` passed.
- `npm run test:unit` passed.
- `npm run test:e2e:workflow:procurement` passed.
- `npm run test:e2e:features:wave1` passed.
- `npm run test:e2e:features:wave2` passed.
- `node scripts/run-playwright-suite.cjs full --project=chromium --manage-server e2e/printing-advertising.spec.ts` passed.
