-- ============================================================================
-- Row Level Security (RLS) Policies for Facility Platform
-- ============================================================================
-- DEPLOYMENT DATE: 2026-02-07
-- This is a RUNNABLE migration file.
-- ============================================================================

-- ============================================================================
-- 0. HELPER FUNCTIONS
-- ============================================================================

-- Get current user's role from the database
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT r.role_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Match against the enum text value
    RETURN (get_user_role()::TEXT = required_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is a guard
CREATE OR REPLACE FUNCTION is_guard()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN has_role('security_guard');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN has_role('admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get employee_id for the authenticated user
CREATE OR REPLACE FUNCTION get_employee_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT employee_id FROM users WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get guard_id for the authenticated user
CREATE OR REPLACE FUNCTION get_guard_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT g.id FROM security_guards g 
        JOIN users u ON u.employee_id = g.employee_id 
        WHERE u.id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_guards ENABLE ROW LEVEL SECURITY;
ALTER TABLE panic_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. EMPLOYEES
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view their own record" ON employees;
CREATE POLICY "Employees can view their own record" ON employees FOR SELECT
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Employees can update their own record" ON employees;
CREATE POLICY "Employees can update their own record" ON employees FOR UPDATE
USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Guards can view employees" ON employees;
CREATE POLICY "Guards can view employees" ON employees FOR SELECT
USING (is_guard());

DROP POLICY IF EXISTS "Supervisors can view all employees" ON employees;
CREATE POLICY "Supervisors can view all employees" ON employees FOR SELECT
USING (has_role('admin') OR has_role('security_supervisor') OR has_role('society_manager') OR has_role('company_hod'));

DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
CREATE POLICY "Admins can manage employees" ON employees FOR ALL
USING (has_role('admin'));

-- ============================================================================
-- 2. SECURITY GUARDS
-- ============================================================================

DROP POLICY IF EXISTS "Guards can view their own record" ON security_guards;
CREATE POLICY "Guards can view their own record" ON security_guards FOR SELECT
USING (id = get_guard_id());

DROP POLICY IF EXISTS "Guards can update their own record" ON security_guards;
CREATE POLICY "Guards can update their own record" ON security_guards FOR UPDATE
USING (id = get_guard_id()) WITH CHECK (id = get_guard_id());

DROP POLICY IF EXISTS "Supervisors can view all guards" ON security_guards;
CREATE POLICY "Supervisors can view all guards" ON security_guards FOR SELECT
USING (has_role('admin') OR has_role('security_supervisor') OR has_role('society_manager'));

DROP POLICY IF EXISTS "Admins can manage guards" ON security_guards;
CREATE POLICY "Admins can manage guards" ON security_guards FOR ALL
USING (has_role('admin'));

-- ============================================================================
-- 3. PANIC ALERTS
-- ============================================================================

DROP POLICY IF EXISTS "Guards can insert their own panic alerts" ON panic_alerts;
CREATE POLICY "Guards can insert their own panic alerts" ON panic_alerts FOR INSERT
WITH CHECK (guard_id = get_guard_id());

DROP POLICY IF EXISTS "Guards can view their own panic alerts" ON panic_alerts;
CREATE POLICY "Guards can view their own panic alerts" ON panic_alerts FOR SELECT
USING (guard_id = get_guard_id());

-- Added: Guards can update their own panic alerts (for self-resolution or updates)
DROP POLICY IF EXISTS "Guards can update their own panic alerts" ON panic_alerts;
CREATE POLICY "Guards can update their own panic alerts" ON panic_alerts FOR UPDATE
USING (guard_id = get_guard_id()) WITH CHECK (guard_id = get_guard_id());

DROP POLICY IF EXISTS "Supervisors can view all panic alerts" ON panic_alerts;
CREATE POLICY "Supervisors can view all panic alerts" ON panic_alerts FOR SELECT
USING (has_role('admin') OR has_role('security_supervisor') OR has_role('society_manager'));

DROP POLICY IF EXISTS "Supervisors can resolve panic alerts" ON panic_alerts;
CREATE POLICY "Supervisors can resolve panic alerts" ON panic_alerts FOR UPDATE
USING (has_role('admin') OR has_role('security_supervisor') OR has_role('society_manager'));

-- Added: Admins can manage all panic alerts
DROP POLICY IF EXISTS "Admins can manage all panic alerts" ON panic_alerts;
CREATE POLICY "Admins can manage all panic alerts" ON panic_alerts FOR ALL
USING (has_role('admin'));

-- ============================================================================
-- 4. RESIDENTS
-- ============================================================================

DROP POLICY IF EXISTS "Residents can view their own record" ON residents;
CREATE POLICY "Residents can view their own record" ON residents FOR SELECT
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Residents can update their own record" ON residents;
CREATE POLICY "Residents can update their own record" ON residents FOR UPDATE
USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Guards can view residents" ON residents;
CREATE POLICY "Guards can view residents" ON residents FOR SELECT
USING (is_guard());

DROP POLICY IF EXISTS "Supervisors can view all residents" ON residents;
CREATE POLICY "Supervisors can view all residents" ON residents FOR SELECT
USING (has_role('admin') OR has_role('security_supervisor') OR has_role('society_manager'));

DROP POLICY IF EXISTS "Admins can manage residents" ON residents;
CREATE POLICY "Admins can manage residents" ON residents FOR ALL
USING (has_role('admin'));

-- ============================================================================
-- 5. VISITORS
-- ============================================================================

DROP POLICY IF EXISTS "Residents can view their flat visitors" ON visitors;
CREATE POLICY "Residents can view their flat visitors" ON visitors FOR SELECT
USING (flat_id IN (SELECT flat_id FROM residents WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Residents can invite visitors" ON visitors;
CREATE POLICY "Residents can invite visitors" ON visitors FOR INSERT
WITH CHECK (
    flat_id IN (SELECT flat_id FROM residents WHERE auth_user_id = auth.uid()) 
    AND approved_by_resident = true
);

DROP POLICY IF EXISTS "Residents can update their flat visitors" ON visitors;
CREATE POLICY "Residents can update their flat visitors" ON visitors FOR UPDATE
USING (
    flat_id IN (SELECT flat_id FROM residents WHERE auth_user_id = auth.uid())
    AND exit_time IS NULL -- Only allowed before they exit
)
WITH CHECK (
    flat_id IN (SELECT flat_id FROM residents WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Residents can delete their flat visitors" ON visitors;
CREATE POLICY "Residents can delete their flat visitors" ON visitors FOR DELETE
USING (
    flat_id IN (SELECT flat_id FROM residents WHERE auth_user_id = auth.uid())
    AND (entry_time IS NULL OR entry_time > (NOW() - INTERVAL '5 minutes'))
);

DROP POLICY IF EXISTS "Guards can view all visitors" ON visitors;
CREATE POLICY "Guards can view all visitors" ON visitors FOR SELECT
USING (is_guard());

DROP POLICY IF EXISTS "Guards can check in visitors" ON visitors;
CREATE POLICY "Guards can check in visitors" ON visitors FOR INSERT
WITH CHECK (is_guard());

DROP POLICY IF EXISTS "Guards can update visitors" ON visitors;
CREATE POLICY "Guards can update visitors" ON visitors FOR UPDATE
USING (is_guard())
WITH CHECK (is_guard());

DROP POLICY IF EXISTS "Supervisors can view all visitors" ON visitors;
CREATE POLICY "Supervisors can view all visitors" ON visitors FOR SELECT
USING (has_role('admin') OR has_role('security_supervisor') OR has_role('society_manager'));

DROP POLICY IF EXISTS "Admins can manage visitors" ON visitors;
CREATE POLICY "Admins can manage visitors" ON visitors FOR ALL
USING (has_role('admin'));

-- ============================================================================
-- 6. ATTENDANCE LOGS
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view their own attendance" ON attendance_logs;
CREATE POLICY "Employees can view their own attendance" ON attendance_logs FOR SELECT
USING (employee_id = get_employee_id());

DROP POLICY IF EXISTS "Employees can clock in" ON attendance_logs;
CREATE POLICY "Employees can clock in" ON attendance_logs FOR INSERT
WITH CHECK (employee_id = get_employee_id());

DROP POLICY IF EXISTS "Employees can update their own attendance" ON attendance_logs;
CREATE POLICY "Employees can update their own attendance" ON attendance_logs FOR UPDATE
USING (employee_id = get_employee_id()) WITH CHECK (employee_id = get_employee_id());

DROP POLICY IF EXISTS "Supervisors can view all attendance" ON attendance_logs;
CREATE POLICY "Supervisors can view all attendance" ON attendance_logs FOR SELECT
USING (has_role('admin') OR has_role('security_supervisor') OR has_role('society_manager'));

-- Added: Supervisors/Admins can correct attendance
DROP POLICY IF EXISTS "Supervisors can correct attendance" ON attendance_logs;
CREATE POLICY "Supervisors can correct attendance" ON attendance_logs FOR UPDATE
USING (has_role('admin') OR has_role('security_supervisor') OR has_role('society_manager'));

DROP POLICY IF EXISTS "Supervisors can insert attendance corrections" ON attendance_logs;
CREATE POLICY "Supervisors can insert attendance corrections" ON attendance_logs FOR INSERT
WITH CHECK (has_role('admin') OR has_role('security_supervisor') OR has_role('society_manager'));

-- ============================================================================
-- 7. GPS TRACKING
-- ============================================================================

DROP POLICY IF EXISTS "Guards can insert their own GPS data" ON gps_tracking;
CREATE POLICY "Guards can insert their own GPS data" ON gps_tracking FOR INSERT
WITH CHECK (employee_id = get_guard_id());

DROP POLICY IF EXISTS "Guards can view their own GPS history" ON gps_tracking;
CREATE POLICY "Guards can view their own GPS history" ON gps_tracking FOR SELECT
USING (employee_id = get_guard_id());

DROP POLICY IF EXISTS "Supervisors can view all GPS data" ON gps_tracking;
CREATE POLICY "Supervisors can view all GPS data" ON gps_tracking FOR SELECT
USING (has_role('admin') OR has_role('security_supervisor') OR has_role('society_manager'));

-- Note: get_guard_id() returns security_guards.id, which maps to the gps_tracking.employee_id column.
DROP POLICY IF EXISTS "Admins can manage gps_tracking" ON gps_tracking;
CREATE POLICY "Admins can manage gps_tracking" ON gps_tracking FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

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

DROP POLICY IF EXISTS "Guards can upload visitor photos" ON storage.objects;
CREATE POLICY "Guards can upload visitor photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'visitor-photos' AND (auth.role() = 'service_role' OR is_guard()));

DROP POLICY IF EXISTS "Guards/Admins can delete visitor photos" ON storage.objects;
CREATE POLICY "Guards/Admins can delete visitor photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'visitor-photos' AND (auth.role() = 'service_role' OR is_admin() OR is_guard()));

-- ============================================================================
-- 9. USERS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users FOR SELECT
USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all users" ON users;
CREATE POLICY "Admins can manage all users" ON users FOR ALL
USING (has_role('admin'));

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
);

-- ============================================================================
-- 10. TRIGGERS & BUSINESS LOGIC
-- ============================================================================

-- Function to prevent guards from modifying immutable visitor fields
CREATE OR REPLACE FUNCTION check_visitor_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- If the user is a guard and NOT an admin, enforce immutability
    IF is_guard() AND NOT is_admin() THEN
        IF OLD.flat_id IS DISTINCT FROM NEW.flat_id OR 
           OLD.visitor_name IS DISTINCT FROM NEW.visitor_name OR
           OLD.approved_by_resident IS DISTINCT FROM NEW.approved_by_resident OR
           OLD.resident_id IS DISTINCT FROM NEW.resident_id OR
           OLD.visitor_type IS DISTINCT FROM NEW.visitor_type THEN
            RAISE EXCEPTION 'Security Policy: Guards cannot modify immutable visitor fields (Name, Flat, Approval Status).';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply immutability trigger to visitors table
DROP TRIGGER IF EXISTS tr_visitor_immutability ON visitors;
CREATE TRIGGER tr_visitor_immutability
BEFORE UPDATE ON visitors
FOR EACH ROW
EXECUTE FUNCTION check_visitor_immutability();
