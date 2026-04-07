# PRD Gap Register

This is the execution backlog for `PRD_CLOSURE_PLAN.md`.  
Sources used for classification:
- `PRD.md`
- `e2e/feature-matrix.ts`
- `docs/PRD_AUDIT_REPORT.md`

## Status Legend

- `implemented+verified`
- `implemented+partial`
- `implemented+unverified`
- `missing`

## Current Backlog

| Area | PRD Anchor | Classification | Evidence / Notes | Owner | Next Action |
|---|---|---|---|---|---|
| HRMS employee documents (PSARA + police) | `PRD.md` HRMS Employee Documents | implemented+verified | PSARA support aligned across hook labels, DB enum migration, and dashboard compliance query | Integration | Keep covered in HRMS contract checks |
| Recruitment to employee conversion (with user linkage) | `PRD.md` Recruitment + User Master | implemented+verified | Conversion now attempts `users` email match, sets `employees.auth_user_id`, updates `users.employee_id`, and blocks already-linked user remaps; guarded by HRMS contract assertions | Integration | Keep covered in HRMS contract checks |
| Leave type master visibility and workflow usage | `PRD.md` Leave Type Master + Employee Leave | implemented+partial | Leave config exists but is under-surfaced and coverage is uneven | Integration | Surface config path and add workflow assertions |
| Security panic/inactivity/checklist chain | `PRD.md` Security Guard Monitoring | implemented+partial | Guard workflow E2E is passing for routine/checklist/panic surface; escalation and inactivity variant depth is still incomplete | Integration | Add explicit panic escalation + inactivity branch assertions |
| AC technician workflow evidence | `PRD.md` AC Service workflow | implemented+partial | Wave-2 AC execution chain passes; photo evidence persistence is now request-scoped with job-session linkage when available | Integration | Add explicit branch assertions for no-session fallback behavior |
| Pest PPE/material/closure chain | `PRD.md` Pest Control workflow | implemented+partial | PPE submissions now carry `service_request_id` and auto-link latest `job_session_id`; still needs E2E proof in this environment | Integration | Run/repair pest wave-2 scenario and clear deferred marker |
| Buyer/supplier fiscal closure + feedback boundary | `PRD.md` Financial Closure & Quality Audit | implemented+partial | Buyer flow is E2E green; procurement finance navigation suite is green; payout validation/force-match/reconciliation transition guards are now asserted in finance contracts | Integration | Add end-to-end assertion that payout action transitions supplier-bill payment status in UI |
| Printing + ad-space operations | `PRD.md` Printing & Advertising Services | implemented+partial | Dedicated Playwright workflow now verifies page access, ad-space tab render path, and ID-generation path in internal printing tab | Integration | Expand to include ad booking persistence + revenue reflection assertions |
| Procurement exception paths (bad material, shortage, RTV) | `PRD.md` Ticket Generation System | implemented+unverified | Tables/workflows exist but branch coverage is not complete | Integration | Add explicit branch assertions in tests and matrix |
| Alternate branch families (HRMS, admin lifecycle, event variants) | `PRD.md` + route/state families | implemented+unverified | Happy paths mostly present; variant coverage is incomplete | Integration | Add branch scenarios and close unverified states |

## Verification Backlog

- Add/confirm wave-1 route/data checks for every PRD workflow family in `e2e/feature-matrix.ts`.
- Add/confirm wave-2 business chains for material workflows.
- Add targeted unit/contract tests for:
  - document compliance rules
  - recruitment conversion truth rules
  - technician request-scoped evidence/PPE/material writes
  - fiscal closure paid + feedback boundaries
- Update this register after each closure slice with changed classification and evidence links.

## Latest Validation Evidence (2026-04-07)

- `type-check`: `npm run type-check` passed after workflow changes.
- Targeted unit/contract suites passed:
  - `tests/unit/hrms-module.contract.test.ts`
  - `tests/unit/finance-module.contract.test.ts`
  - `tests/unit/feedback-gate.test.ts`
  - `tests/unit/service-ops-closure.contract.test.ts`
- E2E buyer suite status:
  - `npm run test:e2e:workflow:buyer` passed (`8 passed`) after fixing managed Next binary resolution in worktree startup scripts.
- E2E guard suite status:
  - `npm run test:e2e:workflow:guard` passed (`8 passed`).
- E2E wave-2 suite status:
  - `npm run test:e2e:features:wave2` passed (`6 passed`) including AC execution and HRMS attendance/leave/payroll chains.
- E2E procurement workflow suite status:
  - `npm run test:e2e:workflow:procurement` passed (`7 passed`) after route/assertion hardening in `e2e/admin-procurement.spec.ts`.
- E2E printing/ad-space dedicated suite status:
  - `node scripts/run-playwright-suite.cjs full --project=chromium --manage-server e2e/printing-advertising.spec.ts` passed (`3 passed`).
- Final gate status:
  - `npm run type-check` passed.
  - `npm run test:unit` passed (`38 passed` test files).
  - `npm run test:e2e:features:wave1` passed (`70 passed`).
  - `npm run test:e2e:features:wave2` passed (`6 passed`) after workflow assertion hardening and wave-2 timeout normalization.
- Result: workflow code changes are type-safe, unit-backed, and key browser-level workflow packs (buyer, guard, procurement, wave-2, printing/ad-space) are green in this environment.
