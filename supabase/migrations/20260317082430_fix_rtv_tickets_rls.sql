
-- Fix overly-permissive RLS policies on rtv_tickets.
-- role_name is a USER-DEFINED enum type, so cast to TEXT for comparison.

-- 1. Role helper function (SECURITY DEFINER so RLS can query safely)
CREATE OR REPLACE FUNCTION public.get_my_app_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT r.role_name::TEXT
  FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.get_my_app_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_app_role() TO authenticated;

-- 2. Drop the old open policies
DROP POLICY IF EXISTS "Allow authenticated read on rtv_tickets" ON rtv_tickets;
DROP POLICY IF EXISTS "Allow authenticated insert on rtv_tickets" ON rtv_tickets;
DROP POLICY IF EXISTS "Allow authenticated update on rtv_tickets" ON rtv_tickets;

-- 3. Role-aware SELECT
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

-- 4. Role-aware INSERT
CREATE POLICY "rtv_tickets_insert" ON rtv_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_app_role() IN ('admin', 'super_admin', 'buyer', 'account', 'storekeeper')
    AND raised_by = auth.uid()
  );

-- 5. Role-aware UPDATE
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

-- 6. DELETE: admin / super_admin only
CREATE POLICY "rtv_tickets_delete" ON rtv_tickets
  FOR DELETE TO authenticated
  USING (
    get_my_app_role() IN ('admin', 'super_admin')
  );
;
