-- Fix 1: redefine get_employee_id() to support employees.auth_user_id fallback
CREATE OR REPLACE FUNCTION get_employee_id()
RETURNS UUID AS $$
DECLARE
    emp_id UUID;
BEGIN
    -- Try users table first
    SELECT employee_id INTO emp_id FROM users WHERE id = auth.uid() LIMIT 1;
    
    -- Fallback to employees table
    IF emp_id IS NULL THEN
        SELECT id INTO emp_id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
    END IF;
    
    RETURN emp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fix 2: Change security_guards policy to use get_employee_id() instead of get_guard_id() to prevent infinite recursion
DROP POLICY IF EXISTS "Guards can view their own record" ON security_guards;
CREATE POLICY "Guards can view their own record" ON security_guards FOR SELECT
USING (employee_id = get_employee_id());

DROP POLICY IF EXISTS "Guards can update their own record" ON security_guards;
CREATE POLICY "Guards can update their own record" ON security_guards FOR UPDATE
USING (employee_id = get_employee_id()) WITH CHECK (employee_id = get_employee_id());

-- Fix 3: Redefine get_guard_id() to use get_employee_id()
CREATE OR REPLACE FUNCTION get_guard_id()
RETURNS UUID AS $$
DECLARE
    guard_id_val UUID;
BEGIN
    SELECT id INTO guard_id_val FROM security_guards WHERE employee_id = get_employee_id() LIMIT 1;
    RETURN guard_id_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fix 4: Redefine get_user_role() to support employees.auth_user_id fallback
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
DECLARE
    role_val user_role;
BEGIN
    -- Try users table
    SELECT r.role_name INTO role_val
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    LIMIT 1;

    -- Fallback for guards who only have auth_user_id in employees
    IF role_val IS NULL THEN
        IF EXISTS (
            SELECT 1 FROM security_guards sg
            JOIN employees e ON sg.employee_id = e.id
            WHERE e.auth_user_id = auth.uid()
        ) THEN
            RETURN 'security_guard'::user_role;
        END IF;
    END IF;

    RETURN role_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fix 5: Redefine is_guard()
CREATE OR REPLACE FUNCTION is_guard()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (get_user_role()::TEXT = 'security_guard');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
