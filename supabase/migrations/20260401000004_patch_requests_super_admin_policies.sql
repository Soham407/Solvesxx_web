-- Ensure super_admin has the same request visibility/management access as admin paths.

DROP POLICY IF EXISTS "Buyers View Own Requests" ON public.requests;
CREATE POLICY "Buyers View Own Requests"
  ON public.requests FOR SELECT
  TO authenticated
  USING (
    buyer_id = auth.uid()
    OR get_user_role() IN ('admin', 'super_admin', 'company_hod', 'company_md', 'account')
  );

DROP POLICY IF EXISTS "Admin Manage Requests" ON public.requests;
CREATE POLICY "Admin Manage Requests"
  ON public.requests FOR ALL
  TO authenticated
  USING (get_user_role() IN ('admin', 'super_admin', 'company_hod', 'account'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'company_hod', 'account'));

DROP POLICY IF EXISTS "View Request Items" ON public.request_items;
CREATE POLICY "View Request Items"
  ON public.request_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.requests r
      WHERE r.id = request_items.request_id
        AND (
          r.buyer_id = auth.uid()
          OR get_user_role() IN ('admin', 'super_admin', 'company_hod', 'account')
        )
    )
  );
