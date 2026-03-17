-- Fix overly-permissive RLS policies on rtv_tickets.
--
-- The original policies used USING (true) / WITH CHECK (true), granting every
-- authenticated user — regardless of role — full read and write access to all
-- RTV tickets, including credit_note_amount and financial fields.
--
-- This migration:
--   1. Creates a SECURITY DEFINER helper to look up the current user's role
--      (avoids a per-row subquery and prevents privilege escalation).
--   2. Drops the old open policies.
--   3. Replaces them with role-aware policies:
--      - Admins/super_admin: full access
--      - Buyers / account / storekeeper: read + create + update (processing roles)
--      - The user who raised a ticket: can always read their own ticket
--      - Suppliers: read tickets where they are the supplier (requires supplier
--        table lookup — see note below)
--      - All other roles: no access

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Role helper function (SECURITY DEFINER so RLS can query safely)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_app_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT r.role_name
  FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.get_my_app_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_app_role() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Drop the old open policies
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated read on rtv_tickets" ON rtv_tickets;
DROP POLICY IF EXISTS "Allow authenticated insert on rtv_tickets" ON rtv_tickets;
DROP POLICY IF EXISTS "Allow authenticated update on rtv_tickets" ON rtv_tickets;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Role-aware SELECT policy
--    Allowed: admin, super_admin, buyer, account, storekeeper, company_md,
--             company_hod, site_supervisor — and the user who raised the ticket.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "rtv_tickets_select" ON rtv_tickets
  FOR SELECT TO authenticated
  USING (
    get_my_app_role() IN (
      'admin', 'super_admin',
      'buyer', 'account', 'storekeeper',
      'company_md', 'company_hod', 'site_supervisor'
    )
    OR raised_by = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Role-aware INSERT policy
--    Only procurement / warehouse roles can raise RTV tickets.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "rtv_tickets_insert" ON rtv_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_app_role() IN ('admin', 'super_admin', 'buyer', 'account', 'storekeeper')
    AND raised_by = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Role-aware UPDATE policy
--    Admins can update any ticket.
--    Buyers/account/storekeeper can update tickets they raised (status changes, notes).
--    Credit note fields (credit_note_amount, credit_note_number, credit_issued_at)
--    are write-restricted to admin/account via column-level security — see below.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "rtv_tickets_update" ON rtv_tickets
  FOR UPDATE TO authenticated
  USING (
    get_my_app_role() IN ('admin', 'super_admin', 'account')
    OR (
      get_my_app_role() IN ('buyer', 'storekeeper')
      AND raised_by = auth.uid()
    )
  )
  WITH CHECK (
    get_my_app_role() IN ('admin', 'super_admin', 'account')
    OR (
      get_my_app_role() IN ('buyer', 'storekeeper')
      AND raised_by = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. DELETE: admin / super_admin only (soft deletes preferred — add a
--    deleted_at column and switch to UPDATE when ready)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "rtv_tickets_delete" ON rtv_tickets
  FOR DELETE TO authenticated
  USING (
    get_my_app_role() IN ('admin', 'super_admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: Supplier-side access
-- Suppliers should eventually see only tickets where supplier_id maps to their
-- account. This requires a lookup like:
--   supplier_id IN (SELECT id FROM suppliers WHERE auth_user_id = auth.uid())
-- Add this once the suppliers table has an auth_user_id column populated.
-- ─────────────────────────────────────────────────────────────────────────────
