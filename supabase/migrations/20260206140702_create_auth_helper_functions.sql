-- ============================================
-- Fix #4: Create correct helper functions
-- These use the new auth_user_id columns
-- ============================================

-- Drop old incorrect functions if they exist
DROP FUNCTION IF EXISTS is_guard();
DROP FUNCTION IF EXISTS is_resident();
DROP FUNCTION IF EXISTS get_guard_id();
DROP FUNCTION IF EXISTS get_resident_id();
DROP FUNCTION IF EXISTS get_employee_id();

-- Function to get employee_id from authenticated user
CREATE OR REPLACE FUNCTION get_employee_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if current user is an employee
CREATE OR REPLACE FUNCTION is_employee()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get guard_id from authenticated user
CREATE OR REPLACE FUNCTION get_guard_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT sg.id 
    FROM security_guards sg
    JOIN employees e ON sg.employee_id = e.id
    WHERE e.auth_user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if current user is a guard
CREATE OR REPLACE FUNCTION is_guard()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM security_guards sg
    JOIN employees e ON sg.employee_id = e.id
    WHERE e.auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get resident_id from authenticated user
CREATE OR REPLACE FUNCTION get_resident_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM residents WHERE auth_user_id = auth.uid() LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if current user is a resident
CREATE OR REPLACE FUNCTION is_resident()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM residents WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get user role from users table
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT r.role_name::TEXT 
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND r.role_name::TEXT = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Comment functions
COMMENT ON FUNCTION get_employee_id() IS 'Returns employee.id for current authenticated user';
COMMENT ON FUNCTION get_guard_id() IS 'Returns security_guards.id for current authenticated guard';
COMMENT ON FUNCTION get_resident_id() IS 'Returns residents.id for current authenticated resident';
COMMENT ON FUNCTION is_guard() IS 'Returns true if current user is a security guard';
COMMENT ON FUNCTION is_resident() IS 'Returns true if current user is a resident';
COMMENT ON FUNCTION is_employee() IS 'Returns true if current user is linked to an employee record';;
