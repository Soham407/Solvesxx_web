# Security & Architecture Audit — FacilityPro

**Date:** 2026-03-17
**Reviewer:** Staff Engineer Review
**Stack:** Next.js 16 App Router + Supabase + TailwindCSS
**Scope:** Full repository review

---

## Fix Status

| # | Issue | Status | File(s) Changed |
|---|-------|--------|-----------------|
| 1 | `.env.local` in git history | ⚠️ MANUAL REQUIRED | See below |
| 2 | RLS `USING(true)` on rtv_tickets | ✅ Fixed | `supabase/migrations/20260317000001_fix_rtv_tickets_rls.sql` |
| 3 | No server-side RBAC enforcement | ✅ Fixed | `middleware.ts` (created) |
| 4 | QR batch download: no role check, no ownership check | ✅ Fixed | `app/api/assets/qr-batch/[batchId]/download/route.ts` |
| 5 | Predictable `batch-${Date.now()}` batch IDs | ✅ Fixed | `app/api/assets/generate-qr-batch/route.ts` |
| 6 | No Zod validation on QR batch API inputs | ✅ Fixed | `app/api/assets/generate-qr-batch/route.ts` |
| 7 | Error message leakage in download route | ✅ Fixed | `app/api/assets/qr-batch/[batchId]/download/route.ts` |
| 8 | Edge function CORS `*` | ✅ Fixed | `supabase/functions/send-notification/index.ts` |
| 9 | Service role key accepted as Bearer token | ✅ Fixed | `supabase/functions/send-notification/index.ts` |
| 10 | No input length/format validation in edge function | ✅ Fixed | `supabase/functions/send-notification/index.ts` |
| 11 | Login IP detection via external `api.ipify.org` | ✅ Fixed | `app/api/auth/client-ip/route.ts` (created), `app/login/page.tsx` |
| 12 | Hardcoded service code strings | ✅ Fixed | `src/lib/service-codes.ts` (created), 3 pages updated |
| 13 | `ignoreBuildErrors: true` in next.config.ts | ⚠️ KEPT INTENTIONALLY | CLAUDE.md prohibits removing — TS2589 from supabase-types.ts |
| 14 | No audit_logs table | ⚠️ TODO | Requires new migration + trigger design |
| 15 | Credentials not rotated | ⚠️ MANUAL REQUIRED | See below |
| 16 | All other RLS tables still use `USING(true)` | ⚠️ TODO | Pattern established in migration 20260317000001 |
| 17 | Role fetched from DB on every request (no JWT claims) | ⚠️ TODO | Requires Supabase Auth hook configuration |
| 18 | 91 hooks with no caching layer | ⚠️ TODO | React Query / SWR adoption needed |
| 19 | Two competing Supabase client patterns | ⚠️ TODO | Gradual migration — new hooks use createClient |

---

## Manual Actions Required (cannot be automated)

### CRITICAL — Do these now

**1. Rotate all credentials**

```
Supabase Dashboard → Settings → API → Regenerate anon key
Supabase Dashboard → Settings → API → Regenerate service_role key
Firebase Console → Project Settings → Service Accounts → Generate new key
MSG91 Dashboard → API Keys → Revoke and regenerate
```

After rotating, update `.env.local` locally and all deployment environment variables (Vercel / server).

**2. Check if `.env.local` was ever committed**

```bash
git log --all --full-history -- .env.local
```

If any commits appear, purge it:

```bash
# Requires git-filter-repo (pip install git-filter-repo)
git filter-repo --path .env.local --invert-paths
git push origin --force --all
git push origin --force --tags
```

Note: `.gitignore` already has `.env*` so future commits are blocked. This is about historical exposure.

**3. Set `ALLOWED_ORIGIN` in Supabase Edge Function Secrets**

```bash
supabase secrets set ALLOWED_ORIGIN=https://your-production-domain.com
```

Without this, the CORS fix in `send-notification` falls back to `*`.

---

## Remaining TODO (not yet fixed)

### Fix RLS on all remaining tables

The `get_my_app_role()` helper function is now installed (migration 20260317000001). Apply the same pattern to every table that still has `USING (true)`. Priority order:

1. `purchase_orders` — financial
2. `material_receipts` — financial
3. `employees` — PII
4. `payroll_records` — highly sensitive
5. `visitors` — security
6. `push_tokens` — privacy

Template for each table:

```sql
DROP POLICY "Allow authenticated read on <table>" ON <table>;

CREATE POLICY "<table>_select" ON <table>
  FOR SELECT TO authenticated
  USING (
    get_my_app_role() IN ('admin', 'super_admin', '<role1>', '<role2>')
    OR created_by = auth.uid()  -- if applicable
  );
```

### Create audit_logs table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,          -- 'INSERT' | 'UPDATE' | 'DELETE'
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- Only admins can read; no one can delete
CREATE POLICY "audit_logs_admin_read" ON audit_logs
  FOR SELECT TO authenticated USING (get_my_app_role() IN ('admin', 'super_admin'));
```

Then add triggers to sensitive tables:

```sql
CREATE OR REPLACE FUNCTION log_table_change() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Embed role in JWT custom claims

This removes the per-request DB query in middleware. Requires a Supabase Auth hook:

1. Supabase Dashboard → Authentication → Hooks → Add Custom JWT Claims hook
2. Hook should add `role` to the JWT: `{ "role": "admin" }`
3. Update `middleware.ts` to read `role` from the decoded token instead of querying the DB
4. Update RLS policies to use `auth.jwt() ->> 'role'` (simpler than `get_my_app_role()`)

---

## High-Risk Issues

### 1. `.env.local` in git history — credentials permanently exposed

The file contains live production keys: Supabase URL, anon key, Firebase API key, Firebase service account sender ID, MSG91 SMS key. These are not placeholder values. Anyone who has ever cloned this repo has them. Rotating the keys is step zero. Then purge the file from git history with `git filter-repo`.

### 2. RLS policies are universally `USING (true)` — every authenticated user owns every row

Every migration (sample: `20260315120000_add_rtv_tickets.sql`) creates policies that grant full SELECT/INSERT/UPDATE to any authenticated user. A logged-in `resident` can read every RTV ticket, every credit note amount, every supplier record.

**Fixed for `rtv_tickets`** via migration `20260317000001_fix_rtv_tickets_rls.sql`. Same fix must be applied to all other tables.

### 3. Middleware RBAC not enforced — `hasAccess()` was only called client-side

`src/lib/auth/roles.ts` defines 19 roles with route prefixes. `AppSidebar.tsx` hides nav items. Previously there was no `middleware.ts` at the project root calling `hasAccess()`. A direct HTTP request to `/reports` or `/finance` from a `security_guard` session was not blocked at the server level.

**Fixed** — `middleware.ts` now calls `hasAccess(role, pathname)` on every request and returns 403 / redirects to dashboard for unauthorized routes.

### 4. QR batch download endpoint had no ownership check

`/api/assets/qr-batch/[batchId]/download` authenticated the user but never checked whether the batch belonged to them. Any authenticated user could enumerate and download any batch by iterating `batchId` values, which were `batch-${Date.now()}` — predictable timestamps.

**Fixed** — Route now verifies user has QR management role AND is either the batch creator or an admin. Batch IDs now use `crypto.randomUUID()`.

### 5. `ignoreBuildErrors: true` silences real type errors

Added for a 606KB auto-generated types file causing TS2589. Per CLAUDE.md this must stay — the alternative (`skipLibCheck`) only skips `.d.ts` lib files, not the project-level `supabase-types.ts`. The underlying fix is splitting the generated types file, which is a larger task.

---

## Security Concerns

### Supabase service role key used without scope minimization

`generate-qr-batch` and `qr-batch/.../download` use the service role key to bypass RLS. Justified for those batch operations but sets a bad precedent.

### Edge function CORS was `*` — now requires `ALLOWED_ORIGIN` secret

`supabase/functions/send-notification/index.ts` now reads `ALLOWED_ORIGIN` from Deno env. **Must be set via `supabase secrets set`** — falls back to `*` if unset.

### Firebase service account stored as raw JSON string in Deno environment

A full Firebase Admin service account key stored as an env var string. Move to Supabase Function Secrets via the dashboard, not `.env.local`.

### Login IP detection now uses local server-side route

Previously called `api.ipify.org` externally. If that service timed out, all IPs resolved to `0.0.0.0`, breaking the lockout mechanism. Now calls `/api/auth/client-ip` which reads `X-Forwarded-For` from request headers server-side.

### No rate limiting on any API route or edge function

Still zero rate limiting. Options:
- Supabase built-in rate limiting (dashboard)
- Vercel Edge rate limiting middleware
- WAF rules (Cloudflare)

---

## Architecture Problems

### Two competing Supabase client patterns

- Old: `import { supabase } from "@/src/lib/supabaseClient"` (singleton)
- New: `import { createClient } from "@/src/lib/supabase/client"` (per-request, SSR-safe)

New hooks should use `createClient`. No hooks were migrated in this pass — 91 hooks is too large a scope change for one PR.

### Role fetched from DB on every request

Middleware queries `users` + `roles` join on every page load. Fix: embed role in JWT custom claims (see Remaining TODO above).

### 91 hooks with no caching

No React Query, SWR, or equivalent. Components that unmount and remount re-fetch on every render. At scale this saturates the connection pool.

### Feature flags are client-side only

`NEXT_PUBLIC_FF_*` variables are visible in DevTools. Routes behind flags are not blocked server-side. Middleware RBAC now at least blocks unauthorized roles from routes, but flags themselves don't feed into server-side logic.

---

## Maintainability Issues

### `@ts-ignore` on Supabase join types

Pattern appears across hooks. Future schema changes will not produce type errors where they should.

### Hardcoded service code strings — now typed

Previously: `"PST-CON"`, `"PRN-ADV"`, `"AC-REP"` scattered as raw strings.
**Fixed** — `src/lib/service-codes.ts` exports `ServiceCode` enum. Three pages updated to use it.

### No audit table

No `audit_logs` table. When something goes wrong in production — a wrong price, a deleted record — there is no way to reconstruct what happened. See Remaining TODO for schema.

---

## Affected Files Reference

| File | Issue | Status |
|------|-------|--------|
| `.env.local` | Live credentials in repository | ⚠️ MANUAL |
| `middleware.ts` | Created — RBAC enforcement | ✅ |
| `supabase/migrations/20260317000001_fix_rtv_tickets_rls.sql` | RLS policies fixed for rtv_tickets | ✅ |
| `supabase/migrations/*.sql` (other tables) | All use `USING(true)` | ⚠️ TODO |
| `src/lib/auth/roles.ts` | RBAC defined — now enforced in middleware | ✅ |
| `src/lib/supabase/middleware.ts` | Wired into root middleware.ts | ✅ |
| `src/lib/service-codes.ts` | Created — typed service code constants | ✅ |
| `app/api/assets/generate-qr-batch/route.ts` | UUID batch IDs + Zod validation | ✅ |
| `app/api/assets/qr-batch/[batchId]/download/route.ts` | Role check + ownership check + no error leakage | ✅ |
| `app/api/auth/client-ip/route.ts` | Created — server-side IP extraction | ✅ |
| `app/login/page.tsx` | Calls local IP route instead of ipify.org | ✅ |
| `supabase/functions/send-notification/index.ts` | CORS restricted, service key auth removed, input validated | ✅ |
| `hooks/*.ts` | Mix of client patterns, `@ts-ignore` usage, no caching | ⚠️ TODO |
| `components/layout/AppSidebar.tsx` | UI-only route gating (now backed by server middleware) | ✅ |
| `next.config.ts` | `ignoreBuildErrors: true` — kept per CLAUDE.md | ⚠️ INTENTIONAL |
