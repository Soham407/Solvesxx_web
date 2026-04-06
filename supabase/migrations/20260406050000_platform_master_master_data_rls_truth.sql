ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage designations" ON public.designations;
DROP POLICY IF EXISTS "All users can view designations" ON public.designations;
DROP POLICY IF EXISTS "designations_admin_full" ON public.designations;
DROP POLICY IF EXISTS "designations_authenticated_read" ON public.designations;

CREATE POLICY "designations_admin_full"
ON public.designations
FOR ALL
TO authenticated
USING (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN (
    'admin',
    'super_admin',
    'company_hod'
  )
)
WITH CHECK (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN (
    'admin',
    'super_admin',
    'company_hod'
  )
);

CREATE POLICY "designations_authenticated_read"
ON public.designations
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "company_locations_admin_full" ON public.company_locations;
DROP POLICY IF EXISTS "company_locations_authenticated_read" ON public.company_locations;

CREATE POLICY "company_locations_admin_full"
ON public.company_locations
FOR ALL
TO authenticated
USING (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN (
    'admin',
    'super_admin',
    'company_hod'
  )
)
WITH CHECK (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN (
    'admin',
    'super_admin',
    'company_hod'
  )
);

CREATE POLICY "company_locations_authenticated_read"
ON public.company_locations
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
