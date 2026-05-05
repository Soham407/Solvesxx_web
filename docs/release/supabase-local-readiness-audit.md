# Supabase Local Readiness Audit (Issue #27)

Date: 2026-05-05 (UTC)
Scope: local migrations/reset path, RLS smoke, storage buckets/policies, edge-function env contracts.

## 1) Local reset and migration path

Command run:

```bash
supabase db reset --local
```

Exact output:

```text
/usr/bin/bash: line 1: supabase: command not found
```

Status: Blocked in this environment because Supabase CLI is not installed.

## 2) RLS smoke tests

Command run:

```bash
npm run test:rls
```

Exact output:

```text
> temp_next@0.1.0 test:rls
> vitest run tests/rls

 RUN  v3.2.4 /home/agent/workspace

 ✓ tests/rls/platform-master-master-data.contract.spec.ts (1 test) 2ms
 ✓ tests/rls/platform-master-system-config.contract.spec.ts (1 test) 2ms
 ✓ tests/rls/rbac-source.contract.spec.ts (5 tests) 4ms

 Test Files  3 passed (3)
      Tests  7 passed (7)
```

Status: PASS.

## 3) Storage buckets and policy verification

Verified migrations for bill uploads, employee documents, visitor/guard photos, and service evidence:

- `bill-documents`: `supabase/migrations/20260320000002_bill_documents_storage.sql`
- `employee-documents`: `supabase/migrations/20260406190000_hrms_secondary_surface_truth_repairs.sql`
- `visitor-photos` (guard/resident flows): `supabase/migrations/20260324000005_visitor_photos_storage_policy.sql`
- `checklist-evidence` (guard evidence uploads): `supabase/migrations/20260421132000_guard_storage_bucket_rls.sql`
- `service-evidence`: `supabase/migrations/20260330000011_plantation_001_module.sql`

All above include explicit `bucket_id = '<bucket-name>'` policy conditions in `storage.objects` policies.

## 4) Edge functions and env var contracts

Functions required by notifications/checklists/inactivity/document expiry and their env contracts:

- `send-notification`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `FIREBASE_SERVICE_ACCOUNT`
  - `MSG91_API_KEY`
  - `MSG91_TEMPLATE_ID`
  - `SMS_SENDER_ID`
  - `ALLOWED_ORIGIN`
- `check-checklist`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET`
  - `ALLOWED_ORIGIN`
- `check-guard-inactivity`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET`
- `check-document-expiry`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET`

Contract source files:

- `supabase/functions/send-notification/index.ts`
- `supabase/functions/check-checklist/index.ts`
- `supabase/functions/check-guard-inactivity/index.ts`
- `supabase/functions/check-document-expiry/index.ts`

## 5) Outcome

- Backend readiness audit artifact created.
- Local reset path blocker captured with exact command output.
- RLS smoke tests executed and passing.
- Storage and edge-function readiness contracts documented for local/production parity checks.
