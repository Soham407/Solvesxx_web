-- ============================================
-- Migration: 20260424096000_fix_rls_recursion
-- Description: Fix infinite recursion in employees/security_guards/users policies
--
-- Root cause:
--   employee_select_isolation queries security_guards inline (not SECURITY DEFINER).
--   security_guards "Guards can view their own record" queries employees.
--   employees policy re-queries security_guards → infinite loop.
--
-- Fix: wrap the security_guards subquery in a SECURITY DEFINER helper so RLS
--   on security_guards is bypassed when evaluating the employee/user/attendance
--   visibility policies.
-- ============================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. SECURITY DEFINER helper: employee IDs visible to current user's managed
--    societies (bypasses security_guards RLS to break the recursion cycle)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_employee_ids_in_managed_societies()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
        SELECT DISTINCT sg.employee_id
        FROM public.security_guards sg
        JOIN public.company_locations cl ON sg.assigned_location_id = cl.id
        WHERE cl.society_id IN (SELECT public.get_my_managed_societies());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. EMPLOYEES — rewrite select policy to use SECURITY DEFINER helper
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "employee_select_isolation" ON employees;

CREATE POLICY "employee_select_isolation" ON employees FOR SELECT
TO authenticated USING (
    auth_user_id = auth.uid()
    OR
    public.get_user_role()::TEXT IN ('admin', 'super_admin')
    OR
    id IN (SELECT public.get_employee_ids_in_managed_societies())
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. USERS — rewrite select policy to use SECURITY DEFINER helper
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_select_isolation" ON users;

CREATE POLICY "user_select_isolation" ON users FOR SELECT
TO authenticated USING (
    id = auth.uid()
    OR
    public.get_user_role()::TEXT IN ('admin', 'super_admin')
    OR
    employee_id IN (SELECT public.get_employee_ids_in_managed_societies())
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. ATTENDANCE_LOGS — rewrite select policy to use SECURITY DEFINER helper
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "attendance_select_isolation" ON attendance_logs;

CREATE POLICY "attendance_select_isolation" ON attendance_logs FOR SELECT
TO authenticated USING (
    employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
    OR
    employee_id IN (SELECT public.get_employee_ids_in_managed_societies())
);
