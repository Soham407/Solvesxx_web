-- ============================================================================
-- 0. HELPER FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS is_admin();
-- Check if user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN has_role('admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 5. VISITORS
-- ============================================================================

DROP POLICY IF EXISTS "Residents can delete their flat visitors" ON visitors;
CREATE POLICY "Residents can delete their flat visitors" ON visitors FOR DELETE
USING (
    flat_id IN (SELECT flat_id FROM residents WHERE auth_user_id = auth.uid())
    AND (entry_time IS NULL OR entry_time > (NOW() - INTERVAL '5 minutes'))
);

-- ============================================================================
-- 7. GPS TRACKING
-- ============================================================================

-- Note: get_guard_id() returns security_guards.id, which maps to the gps_tracking.employee_id column.
DROP POLICY IF EXISTS "Admins can manage gps_tracking" ON gps_tracking;
CREATE POLICY "Admins can manage gps_tracking" ON gps_tracking FOR ALL
USING (is_admin() OR has_role('security_supervisor') OR has_role('society_manager'))
WITH CHECK (is_admin() OR has_role('security_supervisor') OR has_role('society_manager'));

-- ============================================================================
-- 8. STORAGE - Visitor Photos
-- ============================================================================

DROP POLICY IF EXISTS "Specific users can view visitor photos" ON storage.objects;
-- Stricter policy: Only guards, service role, or the resident associated with the visitor record
CREATE POLICY "Specific users can view visitor photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'visitor-photos' AND (
    is_guard() OR 
    auth.role() = 'service_role' OR 
    (SELECT EXISTS (
      SELECT 1 FROM residents r 
      JOIN visitors v ON v.flat_id = r.flat_id 
      WHERE r.auth_user_id = auth.uid() 
      AND (
        name = 'visitors/' || v.id::text || '/' || (regexp_match(name, '[^/]+$'))[1]
        OR name LIKE 'visitors/' || v.id::text || '/%'
      )
    ))
  )
);

DROP POLICY IF EXISTS "Guards/Admins can delete visitor photos" ON storage.objects;
CREATE POLICY "Guards/Admins can delete visitor photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'visitor-photos' AND (auth.role() = 'service_role' OR is_admin() OR is_guard()));

-- ============================================================================
-- 9. USERS
-- ============================================================================

DROP POLICY IF EXISTS "Managers can view subordinate user records" ON users;
CREATE POLICY "Managers can view subordinate user records" ON users FOR SELECT
USING (
    (has_role('security_supervisor') OR has_role('society_manager') OR has_role('company_hod'))
    AND (
        id = auth.uid() -- Can always see own profile
        OR EXISTS (
            SELECT 1 FROM employees target_emp
            JOIN employees manager_emp ON target_emp.reporting_to = manager_emp.id
            JOIN users manager_user ON manager_emp.id = manager_user.employee_id
            WHERE target_emp.id = users.employee_id
            AND manager_user.id = auth.uid()
        )
    )
);;
