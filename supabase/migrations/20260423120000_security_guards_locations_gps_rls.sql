-- ============================================================================
-- RLS Policies: security_guards, company_locations, gps_tracking
-- All three have RLS enabled but no policies in the live DB.
-- Without these: guard profile load fails (guardId/societyId/assignedLocation null),
-- GPS tracking inserts are blocked, and assigned site info doesn't display.
-- ============================================================================

-- ============================================================================
-- SECURITY GUARDS
-- Guards read their own row via employee_id → users → auth.uid() join.
-- Must be created before gps_tracking policy (which references this table).
-- ============================================================================

DROP POLICY IF EXISTS "Guards can view their own record" ON security_guards;
CREATE POLICY "Guards can view their own record" ON security_guards FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT employee_id FROM users WHERE id = auth.uid() AND employee_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Guards can update their own record" ON security_guards;
CREATE POLICY "Guards can update their own record" ON security_guards FOR UPDATE
TO authenticated
USING (
  employee_id IN (
    SELECT employee_id FROM users WHERE id = auth.uid() AND employee_id IS NOT NULL
  )
)
WITH CHECK (
  employee_id IN (
    SELECT employee_id FROM users WHERE id = auth.uid() AND employee_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Supervisors can view all guards" ON security_guards;
CREATE POLICY "Supervisors can view all guards" ON security_guards FOR SELECT
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor', 'society_manager'));

DROP POLICY IF EXISTS "Admins can manage guards" ON security_guards;
CREATE POLICY "Admins can manage guards" ON security_guards FOR ALL
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin'));

-- ============================================================================
-- COMPANY LOCATIONS
-- All authenticated users need SELECT (guards read their assigned site;
-- residents and admins also reference locations in various views).
-- Only admins can manage.
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view locations" ON company_locations;
CREATE POLICY "Authenticated users can view locations" ON company_locations FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage locations" ON company_locations;
CREATE POLICY "Admins can manage locations" ON company_locations FOR ALL
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin'));

-- ============================================================================
-- GPS TRACKING
-- gps_tracking.employee_id stores security_guards.id (not employees.id).
-- Guards INSERT via recordGuardGpsTracking using profile.guardId (= security_guards.id).
-- Supervisors/admins need SELECT for the Live Guard Board.
-- NOTE: security_guards SELECT policy above must exist first for the subquery to work.
-- ============================================================================

DROP POLICY IF EXISTS "Guards can insert their own GPS data" ON gps_tracking;
CREATE POLICY "Guards can insert their own GPS data" ON gps_tracking FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (
    SELECT sg.id FROM security_guards sg
    JOIN users u ON u.employee_id = sg.employee_id
    WHERE u.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guards can view their own GPS history" ON gps_tracking;
CREATE POLICY "Guards can view their own GPS history" ON gps_tracking FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT sg.id FROM security_guards sg
    JOIN users u ON u.employee_id = sg.employee_id
    WHERE u.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Supervisors can view all GPS data" ON gps_tracking;
CREATE POLICY "Supervisors can view all GPS data" ON gps_tracking FOR SELECT
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor', 'society_manager'));

DROP POLICY IF EXISTS "Admins can manage gps_tracking" ON gps_tracking;
CREATE POLICY "Admins can manage gps_tracking" ON gps_tracking FOR ALL
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin'));
