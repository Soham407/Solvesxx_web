
-- Item 3: Fix overly-permissive RLS policies flagged by security advisor
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy

-- 1. qr_scans: "Insert QR Scans" allowed ANY authenticated user.
--    Fix: restrict to roles that can actually generate QR scans.
DROP POLICY IF EXISTS "Insert QR Scans" ON public.qr_scans;
CREATE POLICY "Insert QR Scans" ON public.qr_scans
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY[
      'admin'::user_role,
      'company_hod'::user_role,
      'society_manager'::user_role,
      'service_boy'::user_role
    ])
  );

-- 2. service_feedback: "Allow residents to insert feedback" was always-true,
--    redundantly bypassing the stricter "service_feedback_insert_restricted" policy.
--    The stricter policy already covers the correct roles — drop the permissive one.
DROP POLICY IF EXISTS "Allow residents to insert feedback" ON public.service_feedback;

-- 3. service_requests: "Create Service Requests" was always-true,
--    redundantly bypassing "service_requests_insert_own".
--    The stricter policy already covers the correct roles — drop the permissive one.
DROP POLICY IF EXISTS "Create Service Requests" ON public.service_requests;
;
