-- ============================================================================
-- RLS Policies: panic_alerts
-- Previous migration (20260207035202) used get_guard_id() and has_role()
-- helpers that don't exist in the live DB — all CREATE POLICY calls failed.
-- This migration rewrites them using the auth chain:
--   auth.uid() → employees.auth_user_id → security_guards.employee_id
-- ============================================================================

DROP POLICY IF EXISTS "Guards can insert their own panic alerts" ON panic_alerts;
CREATE POLICY "Guards can insert their own panic alerts" ON panic_alerts FOR INSERT
TO authenticated
WITH CHECK (
  guard_id IN (
    SELECT sg.id FROM security_guards sg
    JOIN employees e ON e.id = sg.employee_id
    WHERE e.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guards can view their own panic alerts" ON panic_alerts;
CREATE POLICY "Guards can view their own panic alerts" ON panic_alerts FOR SELECT
TO authenticated
USING (
  guard_id IN (
    SELECT sg.id FROM security_guards sg
    JOIN employees e ON e.id = sg.employee_id
    WHERE e.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guards can update their own panic alerts" ON panic_alerts;
CREATE POLICY "Guards can update their own panic alerts" ON panic_alerts FOR UPDATE
TO authenticated
USING (
  guard_id IN (
    SELECT sg.id FROM security_guards sg
    JOIN employees e ON e.id = sg.employee_id
    WHERE e.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  guard_id IN (
    SELECT sg.id FROM security_guards sg
    JOIN employees e ON e.id = sg.employee_id
    WHERE e.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Supervisors can view all panic alerts" ON panic_alerts;
CREATE POLICY "Supervisors can view all panic alerts" ON panic_alerts FOR SELECT
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor', 'society_manager'));

DROP POLICY IF EXISTS "Supervisors can resolve panic alerts" ON panic_alerts;
CREATE POLICY "Supervisors can resolve panic alerts" ON panic_alerts FOR UPDATE
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor', 'society_manager'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor', 'society_manager'));

DROP POLICY IF EXISTS "Admins can manage all panic alerts" ON panic_alerts;
CREATE POLICY "Admins can manage all panic alerts" ON panic_alerts FOR ALL
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin'));
