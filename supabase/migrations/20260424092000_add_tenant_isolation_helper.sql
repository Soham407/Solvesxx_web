-- ============================================
-- Migration: 20260424092000_add_tenant_isolation_helper
-- Description: Helper to resolve society IDs for the current user across all roles
-- ============================================

CREATE OR REPLACE FUNCTION public.get_my_managed_societies()
RETURNS SETOF UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_role TEXT := public.get_user_role()::TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    -- 1. super_admin, admin, account, company_md: Platform-wide or multi-society access
    -- 2. supplier: Suppliers typically serve multiple societies; returning all for now.
    -- FIXME: Future update should restrict suppliers to societies where they have active POs/Indents.
    IF v_role IN ('super_admin', 'admin', 'account', 'company_md', 'supplier', 'vendor') THEN
        RETURN QUERY SELECT id FROM public.societies;
        RETURN;
    END IF;

    -- 3. society_manager: Sees societies they manage directly
    IF v_role = 'society_manager' THEN
        RETURN QUERY SELECT id FROM public.societies WHERE society_manager_id = v_user_id;
        RETURN;
    END IF;

    -- 4. security_supervisor / site_supervisor: via security_guards assignment
    IF v_role IN ('security_supervisor', 'site_supervisor', 'company_hod') THEN
        RETURN QUERY
            SELECT DISTINCT cl.society_id
            FROM public.company_locations cl
            JOIN public.security_guards sg ON sg.assigned_location_id = cl.id
            JOIN public.users u ON u.employee_id = sg.employee_id
            WHERE u.id = v_user_id;
        RETURN;
    END IF;

    -- 5. security_guard: via security_guards assignment
    IF v_role = 'security_guard' THEN
        RETURN QUERY
            SELECT cl.society_id
            FROM public.company_locations cl
            JOIN public.security_guards sg ON sg.assigned_location_id = cl.id
            JOIN public.users u ON u.employee_id = sg.employee_id
            WHERE u.id = v_user_id;
        RETURN;
    END IF;

    -- 6. resident: via flat -> building -> society
    IF v_role = 'resident' THEN
        RETURN QUERY
            SELECT b.society_id
            FROM public.residents r
            JOIN public.flats f ON r.flat_id = f.id
            JOIN public.buildings b ON f.building_id = b.id
            WHERE r.auth_user_id = v_user_id;
        RETURN;
    END IF;

    -- 7. buyer: via requests -> company_locations -> society
    IF v_role = 'buyer' THEN
        RETURN QUERY
            SELECT DISTINCT cl.society_id
            FROM public.company_locations cl
            JOIN public.requests r ON r.location_id = cl.id
            WHERE r.buyer_id = v_user_id;
        RETURN;
    END IF;

    -- 8. generic staff fallback: via security_guards if exists, else empty
    RETURN QUERY
        SELECT DISTINCT cl.society_id
        FROM public.company_locations cl
        JOIN public.security_guards sg ON sg.assigned_location_id = cl.id
        JOIN public.users u ON u.employee_id = sg.employee_id
        WHERE u.id = v_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;
