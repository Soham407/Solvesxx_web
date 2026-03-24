-- ============================================
-- Fix: Set search_path on all helper functions
-- Prevents search_path manipulation attacks
-- ============================================

-- Recreate functions with SET search_path = ''

CREATE OR REPLACE FUNCTION get_employee_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION is_employee()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION get_guard_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT sg.id 
    FROM public.security_guards sg
    JOIN public.employees e ON sg.employee_id = e.id
    WHERE e.auth_user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION is_guard()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.security_guards sg
    JOIN public.employees e ON sg.employee_id = e.id
    WHERE e.auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION get_resident_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.residents WHERE auth_user_id = auth.uid() LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION is_resident()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.residents WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT r.role_name::TEXT 
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND r.role_name::TEXT = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';;
