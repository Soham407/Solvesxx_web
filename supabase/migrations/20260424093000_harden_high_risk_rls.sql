-- ============================================
-- Migration: 20260424093000_harden_high_risk_rls
-- Description: Harden residents, employees, users, attendance_logs with tenant isolation
-- ============================================

-- -----------------------------------------------------------
-- 1. RESIDENTS
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Residents can view their own record" ON residents;
DROP POLICY IF EXISTS "Residents can update their own record" ON residents;
DROP POLICY IF EXISTS "Guards can view residents" ON residents;so wh
DROP POLICY IF EXISTS "Supervisors can view all residents" ON residents;
DROP POLICY IF EXISTS "Admins can manage residents" ON residents;
DROP POLICY IF EXISTS "residents_society_manager_insert" ON residents;
DROP POLICY IF EXISTS "resident_select_isolation" ON residents;
DROP POLICY IF EXISTS "resident_update_isolation" ON residents;
DROP POLICY IF EXISTS "resident_insert_isolation" ON residents;

CREATE POLICY "resident_select_isolation" ON residents FOR SELECT
TO authenticated USING (
    auth_user_id = auth.uid() 
    OR 
    flat_id IN (
        SELECT f.id FROM flats f 
        JOIN buildings b ON f.building_id = b.id 
        WHERE b.society_id IN (SELECT public.get_my_managed_societies())
    )
);

CREATE POLICY "resident_update_isolation" ON residents FOR UPDATE
TO authenticated USING (
    auth_user_id = auth.uid()
    OR
    (public.get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager'))
)
WITH CHECK (
    auth_user_id = auth.uid()
    OR
    (public.get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager'))
);

CREATE POLICY "resident_insert_isolation" ON residents FOR INSERT
TO authenticated WITH CHECK (
    public.get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager')
);

-- -----------------------------------------------------------
-- 2. EMPLOYEES
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Employees can view their own record" ON employees;
DROP POLICY IF EXISTS "Employees can update their own record" ON employees;
DROP POLICY IF EXISTS "Guards can view employees" ON employees;
DROP POLICY IF EXISTS "Supervisors can view all employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
DROP POLICY IF EXISTS "employee_select_isolation" ON employees;
DROP POLICY IF EXISTS "employee_manage_isolation" ON employees;

CREATE POLICY "employee_select_isolation" ON employees FOR SELECT
TO authenticated USING (
    auth_user_id = auth.uid()
    OR
    public.get_user_role()::TEXT IN ('admin', 'super_admin')
    OR
    id IN (
        SELECT sg.employee_id FROM security_guards sg
        JOIN company_locations cl ON sg.assigned_location_id = cl.id
        WHERE cl.society_id IN (SELECT public.get_my_managed_societies())
    )
);

CREATE POLICY "employee_manage_isolation" ON employees FOR ALL
TO authenticated USING (
    public.get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager', 'company_hod')
)
WITH CHECK (
    public.get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager', 'company_hod')
);

-- -----------------------------------------------------------
-- 3. USERS
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Admin can manage all users" ON users;
DROP POLICY IF EXISTS "Authenticated users can view users" ON users;
DROP POLICY IF EXISTS "user_select_isolation" ON users;

CREATE POLICY "user_select_isolation" ON users FOR SELECT
TO authenticated USING (
    id = auth.uid()
    OR
    public.get_user_role()::TEXT IN ('admin', 'super_admin')
    OR
    employee_id IN (
        SELECT sg.employee_id FROM security_guards sg
        JOIN company_locations cl ON sg.assigned_location_id = cl.id
        WHERE cl.society_id IN (SELECT public.get_my_managed_societies())
    )
);

-- -----------------------------------------------------------
-- 4. ATTENDANCE_LOGS
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Employees can view their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Employees can clock in" ON attendance_logs;
DROP POLICY IF EXISTS "Employees can update their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Supervisors can view all attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Supervisors can correct attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Supervisors can insert attendance corrections" ON attendance_logs;
DROP POLICY IF EXISTS "attendance_select_isolation" ON attendance_logs;
DROP POLICY IF EXISTS "attendance_insert_isolation" ON attendance_logs;

CREATE POLICY "attendance_select_isolation" ON attendance_logs FOR SELECT
TO authenticated USING (
    employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
    OR
    employee_id IN (
        SELECT sg.employee_id FROM security_guards sg
        JOIN company_locations cl ON sg.assigned_location_id = cl.id
        WHERE cl.society_id IN (SELECT public.get_my_managed_societies())
    )
);

CREATE POLICY "attendance_insert_isolation" ON attendance_logs FOR INSERT
TO authenticated WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
    OR
    public.get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager', 'company_hod', 'security_supervisor')
);
