-- HRMS secondary surface truth repairs:
-- 1. restore the employee-documents storage contract used by the UI
-- 2. unlock admin-managed company events writes
-- 3. unlock shift and shift-assignment management for authenticated admins/supervisors

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-documents',
  'employee-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Employees view own documents" ON storage.objects;
CREATE POLICY "Employees view own documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.employee_id::text = (storage.foldername(name))[1]
    )
    OR has_role('admin')
    OR has_role('company_hod')
    OR has_role('company_md')
    OR has_role('super_admin')
  )
);

DROP POLICY IF EXISTS "Employees upload own documents" ON storage.objects;
CREATE POLICY "Employees upload own documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
  AND (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.employee_id::text = (storage.foldername(name))[1]
    )
    OR has_role('admin')
    OR has_role('company_hod')
    OR has_role('company_md')
    OR has_role('super_admin')
  )
);

DROP POLICY IF EXISTS "Admins update documents" ON storage.objects;
CREATE POLICY "Admins update documents" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (
    has_role('admin')
    OR has_role('company_hod')
    OR has_role('company_md')
    OR has_role('super_admin')
  )
)
WITH CHECK (
  bucket_id = 'employee-documents'
  AND (
    has_role('admin')
    OR has_role('company_hod')
    OR has_role('company_md')
    OR has_role('super_admin')
  )
);

DROP POLICY IF EXISTS "Admins delete documents" ON storage.objects;
CREATE POLICY "Admins delete documents" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (
    has_role('admin')
    OR has_role('company_hod')
    OR has_role('company_md')
    OR has_role('super_admin')
  )
);

DROP POLICY IF EXISTS "Admins manage company events" ON public.company_events;
CREATE POLICY "Admins manage company events" ON public.company_events
FOR ALL TO authenticated
USING (
  has_role('admin')
  OR has_role('company_hod')
  OR has_role('company_md')
  OR has_role('super_admin')
)
WITH CHECK (
  has_role('admin')
  OR has_role('company_hod')
  OR has_role('company_md')
  OR has_role('super_admin')
);

DROP POLICY IF EXISTS "Authenticated users view shifts" ON public.shifts;
CREATE POLICY "Authenticated users view shifts" ON public.shifts
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins manage shifts" ON public.shifts;
CREATE POLICY "Admins manage shifts" ON public.shifts
FOR ALL TO authenticated
USING (
  has_role('admin')
  OR has_role('security_supervisor')
  OR has_role('company_hod')
  OR has_role('super_admin')
)
WITH CHECK (
  has_role('admin')
  OR has_role('security_supervisor')
  OR has_role('company_hod')
  OR has_role('super_admin')
);

DROP POLICY IF EXISTS "Authenticated users view shift assignments" ON public.employee_shift_assignments;
CREATE POLICY "Authenticated users view shift assignments" ON public.employee_shift_assignments
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins manage shift assignments" ON public.employee_shift_assignments;
CREATE POLICY "Admins manage shift assignments" ON public.employee_shift_assignments
FOR ALL TO authenticated
USING (
  has_role('admin')
  OR has_role('security_supervisor')
  OR has_role('company_hod')
  OR has_role('super_admin')
)
WITH CHECK (
  has_role('admin')
  OR has_role('security_supervisor')
  OR has_role('company_hod')
  OR has_role('super_admin')
);
