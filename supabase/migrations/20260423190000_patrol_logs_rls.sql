-- ============================================================================
-- RLS Policies: guard_patrol_logs
-- RLS was enabled in 20260216124948 but no working policies were ever created.
-- guard_patrol_logs.guard_id → security_guards(id)
-- Auth chain: auth.uid() → employees.auth_user_id → security_guards.employee_id
-- ============================================================================

DROP POLICY IF EXISTS "Guards can view their own patrol logs" ON guard_patrol_logs;
CREATE POLICY "Guards can view their own patrol logs" ON guard_patrol_logs FOR SELECT
TO authenticated
USING (
  guard_id IN (
    SELECT sg.id FROM security_guards sg
    JOIN employees e ON e.id = sg.employee_id
    WHERE e.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guards can insert patrol logs" ON guard_patrol_logs;
CREATE POLICY "Guards can insert patrol logs" ON guard_patrol_logs FOR INSERT
TO authenticated
WITH CHECK (
  guard_id IN (
    SELECT sg.id FROM security_guards sg
    JOIN employees e ON e.id = sg.employee_id
    WHERE e.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guards can update their own patrol logs" ON guard_patrol_logs;
CREATE POLICY "Guards can update their own patrol logs" ON guard_patrol_logs FOR UPDATE
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

DROP POLICY IF EXISTS "Supervisors can view all patrol logs" ON guard_patrol_logs;
CREATE POLICY "Supervisors can view all patrol logs" ON guard_patrol_logs FOR SELECT
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor', 'society_manager'));

DROP POLICY IF EXISTS "Supervisors can update patrol logs" ON guard_patrol_logs;
CREATE POLICY "Supervisors can update patrol logs" ON guard_patrol_logs FOR UPDATE
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor'));

DROP POLICY IF EXISTS "Admins can manage all patrol logs" ON guard_patrol_logs;
CREATE POLICY "Admins can manage all patrol logs" ON guard_patrol_logs FOR ALL
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin'));
