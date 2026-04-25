-- ============================================
-- Migration: 20260425010000_fix_guard_id_auth_chain
-- Description: Fix get_guard_id() and get_my_managed_societies() guard path
--   to use employees.auth_user_id directly, removing dependency on public.users.
--
-- Root cause:
--   get_guard_id() joined public.users to find the guard, requiring a public.users
--   row for every guard. Guards logging in via phone OTP have no public.users row,
--   causing get_guard_visitors() to always return 0 rows.
--
-- Fix: use employees.auth_user_id (set when employee is created) as the auth link.
-- ============================================

-- Fix get_guard_id() — used by get_guard_visitors and RLS policies
CREATE OR REPLACE FUNCTION public.get_guard_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT sg.id
    FROM public.security_guards sg
    JOIN public.employees e ON e.id = sg.employee_id
    WHERE e.auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Fix get_my_managed_societies() guard path — used by RLS policies
CREATE OR REPLACE FUNCTION public.get_my_managed_societies()
RETURNS SETOF UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_role TEXT := public.get_user_role()::TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    -- 1. Platform-wide roles
    IF v_role IN ('super_admin', 'admin', 'account', 'company_md', 'supplier', 'vendor') THEN
        RETURN QUERY SELECT id FROM public.societies;
        RETURN;
    END IF;

    -- 2. society_manager
    IF v_role = 'society_manager' THEN
        RETURN QUERY SELECT id FROM public.societies WHERE society_manager_id = v_user_id;
        RETURN;
    END IF;

    -- 3. security_supervisor / site_supervisor
    IF v_role IN ('security_supervisor', 'site_supervisor', 'company_hod') THEN
        RETURN QUERY
            SELECT DISTINCT cl.society_id
            FROM public.company_locations cl
            JOIN public.security_guards sg ON sg.assigned_location_id = cl.id
            JOIN public.employees e ON e.id = sg.employee_id
            WHERE e.auth_user_id = v_user_id;
        RETURN;
    END IF;

    -- 4. security_guard — use employees.auth_user_id (no public.users row required)
    IF v_role = 'security_guard' THEN
        RETURN QUERY
            SELECT cl.society_id
            FROM public.company_locations cl
            JOIN public.security_guards sg ON sg.assigned_location_id = cl.id
            JOIN public.employees e ON e.id = sg.employee_id
            WHERE e.auth_user_id = v_user_id;
        RETURN;
    END IF;

    -- 5. resident — via flat -> building -> society
    IF v_role = 'resident' THEN
        RETURN QUERY
            SELECT b.society_id
            FROM public.residents r
            JOIN public.flats f ON r.flat_id = f.id
            JOIN public.buildings b ON f.building_id = b.id
            WHERE r.auth_user_id = v_user_id;
        RETURN;
    END IF;

    -- 6. buyer
    IF v_role = 'buyer' THEN
        RETURN QUERY
            SELECT DISTINCT cl.society_id
            FROM public.company_locations cl
            JOIN public.requests r ON r.location_id = cl.id
            WHERE r.buyer_id = v_user_id;
        RETURN;
    END IF;

    -- 7. generic fallback via security_guards
    RETURN QUERY
        SELECT DISTINCT cl.society_id
        FROM public.company_locations cl
        JOIN public.security_guards sg ON sg.assigned_location_id = cl.id
        JOIN public.employees e ON e.id = sg.employee_id
        WHERE e.auth_user_id = v_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;
