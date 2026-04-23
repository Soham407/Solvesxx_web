-- ============================================================================
-- RLS Policies: security_guards, gps_tracking
-- Previous migration (20260207035202) used get_guard_id(), has_role(),
-- is_admin() helpers that don't exist in the live DB — all CREATE POLICY
-- calls failed silently after DROP POLICY IF EXISTS succeeded.
--
-- security_guards.employee_id → employees.id
-- gps_tracking.employee_id   → security_guards.id  (confusingly named column)
-- Auth chain for guards:
--   auth.uid() → employees.auth_user_id → security_guards.employee_id
-- ============================================================================

-- ============================================================================
-- SECURITY GUARDS
-- ============================================================================

DROP POLICY IF EXISTS "Guards can view their own record" ON security_guards;
CREATE POLICY "Guards can view their own record" ON security_guards FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guards can update their own record" ON security_guards;
CREATE POLICY "Guards can update their own record" ON security_guards FOR UPDATE
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  employee_id IN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
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
-- GPS TRACKING
-- NOTE: gps_tracking.employee_id stores security_guards.id, not employees.id
-- Auth chain: auth.uid() → employees.auth_user_id → security_guards.employee_id
--             → security_guards.id = gps_tracking.employee_id
-- ============================================================================

DROP POLICY IF EXISTS "Guards can insert their own GPS data" ON gps_tracking;
CREATE POLICY "Guards can insert their own GPS data" ON gps_tracking FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (
    SELECT sg.id FROM security_guards sg
    JOIN employees e ON e.id = sg.employee_id
    WHERE e.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guards can view their own GPS history" ON gps_tracking;
CREATE POLICY "Guards can view their own GPS history" ON gps_tracking FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT sg.id FROM security_guards sg
    JOIN employees e ON e.id = sg.employee_id
    WHERE e.auth_user_id = auth.uid()
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
