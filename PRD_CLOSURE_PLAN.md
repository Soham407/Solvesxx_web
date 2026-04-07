# Full PRD Closure Plan

## Summary

Implement and verify the entire current `PRD.md` as mandatory scope, not just the already-audited client subset. The goal is to close three classes of gaps across the promoted `main` state at `758dbb2`:

- `missing`: PRD behaviors or data models not actually present
- `partial`: flows that exist but still contain placeholders, fake UX, or incomplete persistence
- `not verified`: features that may exist but do not yet have trustworthy end-to-end proof

The finish line is `build + verify`: every PRD workflow must be real in the UI/data layer and covered by targeted tests, Playwright flows, browser verification, and an updated audit record.

## Implementation Changes

### 1. Convert PRD into a strict gap register and execution backlog

- Build a PRD-to-product matrix from `PRD.md`, `e2e/feature-matrix.ts`, and `docs/PRD_AUDIT_REPORT.md`.
- Classify each PRD item as `implemented+verified`, `implemented+partial`, `implemented+unverified`, or `missing`.
- Treat current feature-freeze labels as non-authoritative if they contradict the PRD.
- Use this gap register as the source of truth for sequencing, verification, and final closure.

### 2. Close the highest-confidence PRD mismatches first

- HRMS document model:
  - add first-class support for security licensing / PSARA-style document handling if PRD requires it
  - ensure upload, verify, reject, expiry, renewal, and visibility truth all work through the real UI
- Recruitment finalization:
  - complete candidate progression from applicant/interview/BGV/offer to real employee conversion
  - ensure conversion creates the right employee/user/master-data links without audit-false shortcuts
- Leave type master:
  - make leave-type configuration part of the shipped PRD surface, not a hidden/frozen afterthought
  - verify leave rules actually feed leave workflow and payroll behavior where intended

### 3. Replace partial workflow shells with real end-to-end behavior

- Security / society:
  - replace simulated guard situational map behavior with truthful location rendering or an explicitly real fallback tied to stored GPS coordinates
  - make dispatch persist real assignments instead of toast-only UX
  - verify panic, inactivity, checklist, emergency contact, visitor arrival, and society dashboard chains against PRD expectations
- AC / pest technician execution:
  - remove "coming soon" evidence capture from technician dashboards
  - make before/after photo capture, PPE checks, material issue/usage, and closure request-scoped and persisted
  - resolve the currently deferred pest PPE chain so deterministic E2E verification becomes possible
- Buyer / finance closure:
  - replace non-functional online payment actions with either a real payment path or an explicitly PRD-aligned payable workflow that reaches `paid`
  - ensure buyer bill settlement, supplier payout, reconciliation, and feedback complete the PRD boundary cleanly
- Printing & advertising:
  - audit and complete internal printing, ID generation, notices/templates, ad-space master, and booking/revenue workflows
  - verify that these are operational workflows, not just route surfaces

### 4. Finish the unverified and alternate PRD branches

- Re-audit all currently documented alternate branches left unverified in HRMS and other modules.
- Expand from "happy path closed" to "full PRD path family closed" for:
  - recruit-to-hire variants
  - document reject/download/renewal
  - shift unassign and lifecycle maintenance
  - event cancel and status variants
  - admin lifecycle and role/permission maintenance variants
  - procurement exceptions such as returns, shortages, bad-material checks, and status-control paths
- Where a PRD section exists but lacks formal tests in the matrix, add explicit feature/workflow coverage.

### 5. Make verification first-class and branch-truthful

- Extend the feature matrix so every PRD workflow family has:
  - a wave-1 route/data readiness check
  - a wave-2 business workflow chain where the workflow is material
- Add or expand:
  - targeted unit/contract tests for newly introduced truth rules
  - RLS/API tests for new DB-backed behaviors
  - Playwright flows for each missing or previously deferred PRD chain
- Keep final acceptance gated by:
  - `tsc --noEmit`
  - `npm run build`
  - relevant unit/contract suites
  - relevant Playwright suites
  - live browser verification for each newly closed PRD workflow
- Update `docs/PRD_AUDIT_REPORT.md` after each closure slice with `verified`, `fixed`, `untested`, and `blocked`.

## Delivery Sequence

1. Build the PRD gap register and freeze the exact backlog.
2. Close structural HRMS mismatches and recruit-to-employee truth.
3. Close technician execution gaps for AC and pest, including evidence/PPE/material truth.
4. Close security/society simulation gaps and dispatch/map workflow truth.
5. Close finance and buyer settlement gaps to reach PRD payment/fiscal closure.
6. Audit and complete Printing & Advertising.
7. Sweep all remaining alternate branches and exception paths.
8. Run a branch-wide regression and issue the final PRD-closure audit verdict.

## Public Interfaces, Data, and Contracts

- Extend HRMS document types and related validation/storage policies to cover PRD-required security licensing artifacts.
- Add or repair request-scoped technician evidence/PPE/material records where current data shape is insufficient for deterministic workflows.
- Expand feature-matrix workflow definitions so deferred PRD chains become first-class verified scenarios.
- Update tests/contracts wherever source-of-truth rules, route gating, or RLS policies change.

## Test Plan

- Unit/contract:
  - document-type/model support
  - recruitment conversion rules
  - leave/payroll integration rules
  - dispatch/map/security workflow truth
  - buyer/supplier payment and reconciliation rules
  - printing/ad-space master and booking logic
- Playwright:
  - guard monitoring and visitor/resident flow
  - panic and inactivity escalation flow
  - AC technician job flow with before/after evidence
  - pest technician PPE/material/closure flow
  - recruit -> BGV -> offer -> employee conversion
  - buyer invoice -> payment -> feedback
  - supplier bill -> payout -> reconciliation
  - printing/ad-space workflow
- Browser verification:
  - rerun each newly repaired flow manually in the real UI before marking it closed
- Final regression:
  - full audited suite across platform, procurement, society/security, HRMS, and services

## Assumptions

- `Full PRD` is the target scope, even where the repo currently treats parts as future-phase.
- `Perfect to PRD` means both implementation completeness and verification completeness, not route presence alone.
- Work continues in the clean integration worktree pattern, not the parked root backup branch.
- If PRD language conflicts with current product assumptions, PRD wins unless a hard technical blocker is discovered and documented.
