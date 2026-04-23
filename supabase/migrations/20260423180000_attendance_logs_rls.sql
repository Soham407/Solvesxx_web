-- ============================================================================
-- RLS Policies: attendance_logs
-- Previous migration (20260207035202) used get_employee_id() helper that
-- doesn't exist in the live DB — all CREATE POLICY calls failed silently.
-- This migration rewrites them using:
--   auth.uid() → employees.auth_user_id → employees.id
-- ============================================================================

DROP POLICY IF EXISTS "Guards can view their own attendance" ON attendance_logs;
CREATE POLICY "Guards can view their own attendance" ON attendance_logs FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guards can clock in" ON attendance_logs;
CREATE POLICY "Guards can clock in" ON attendance_logs FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guards can clock out" ON attendance_logs;
CREATE POLICY "Guards can clock out" ON attendance_logs FOR UPDATE
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

DROP POLICY IF EXISTS "Supervisors can view all attendance" ON attendance_logs;
CREATE POLICY "Supervisors can view all attendance" ON attendance_logs FOR SELECT
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor', 'society_manager'));

DROP POLICY IF EXISTS "Supervisors can correct attendance" ON attendance_logs;
CREATE POLICY "Supervisors can correct attendance" ON attendance_logs FOR INSERT
TO authenticated
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor'));

DROP POLICY IF EXISTS "Supervisors can update attendance" ON attendance_logs;
CREATE POLICY "Supervisors can update attendance" ON attendance_logs FOR UPDATE
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor'));

DROP POLICY IF EXISTS "Admins can manage all attendance" ON attendance_logs;
CREATE POLICY "Admins can manage all attendance" ON attendance_logs FOR ALL
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin'));
