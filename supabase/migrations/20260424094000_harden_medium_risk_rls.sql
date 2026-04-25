-- ============================================
-- Migration: 20260424094000_harden_medium_risk_rls
-- Description: Harden visitors, requests, service_requests, checklist_responses
-- ============================================

-- -----------------------------------------------------------
-- 1. VISITORS
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Residents can view their flat visitors" ON visitors;
DROP POLICY IF EXISTS "Residents can invite visitors" ON visitors;
DROP POLICY IF EXISTS "Residents can update their flat visitors" ON visitors;
DROP POLICY IF EXISTS "Guards can view all visitors" ON visitors;
DROP POLICY IF EXISTS "Guards can check in visitors" ON visitors;
DROP POLICY IF EXISTS "Guards can update visitors" ON visitors;
DROP POLICY IF EXISTS "Supervisors can view all visitors" ON visitors;
DROP POLICY IF EXISTS "Admins can manage visitors" ON visitors;
DROP POLICY IF EXISTS "visitor_select_isolation" ON visitors;
DROP POLICY IF EXISTS "visitor_insert_isolation" ON visitors;
DROP POLICY IF EXISTS "visitor_update_isolation" ON visitors;

CREATE POLICY "visitor_select_isolation" ON visitors FOR SELECT
TO authenticated USING (
    public.get_user_role()::TEXT IN ('admin', 'super_admin')
    OR
    flat_id IN (
        SELECT f.id FROM flats f
        JOIN buildings b ON f.building_id = b.id
        WHERE b.society_id IN (SELECT public.get_my_managed_societies())
    )
);

CREATE POLICY "visitor_insert_isolation" ON visitors FOR INSERT
TO authenticated WITH CHECK (
    public.get_user_role()::TEXT IN ('admin', 'super_admin')
    OR
    flat_id IN (
        SELECT f.id FROM flats f
        JOIN buildings b ON f.building_id = b.id
        WHERE b.society_id IN (SELECT public.get_my_managed_societies())
    )
);

CREATE POLICY "visitor_update_isolation" ON visitors FOR UPDATE
TO authenticated USING (
    public.get_user_role()::TEXT IN ('admin', 'super_admin')
    OR
    flat_id IN (
        SELECT f.id FROM flats f
        JOIN buildings b ON f.building_id = b.id
        WHERE b.society_id IN (SELECT public.get_my_managed_societies())
    )
)
WITH CHECK (
    public.get_user_role()::TEXT IN ('admin', 'super_admin')
    OR
    flat_id IN (
        SELECT f.id FROM flats f
        JOIN buildings b ON f.building_id = b.id
        WHERE b.society_id IN (SELECT public.get_my_managed_societies())
    )
);

-- -----------------------------------------------------------
-- 2. REQUESTS (Buyer Requests)
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Buyers View Own Requests" ON requests;
DROP POLICY IF EXISTS "Admin Manage Requests" ON requests;
DROP POLICY IF EXISTS "Buyers Create Own Requests" ON requests;
DROP POLICY IF EXISTS "request_select_isolation" ON requests;
DROP POLICY IF EXISTS "request_manage_isolation" ON requests;

CREATE POLICY "request_select_isolation" ON requests FOR SELECT
TO authenticated USING (
    buyer_id = auth.uid()
    OR
    public.get_user_role()::TEXT IN ('admin', 'super_admin')
    OR
    location_id IN (
        SELECT id FROM company_locations
        WHERE society_id IN (SELECT public.get_my_managed_societies())
    )
);

CREATE POLICY "request_manage_isolation" ON requests FOR ALL
TO authenticated USING (
    buyer_id = auth.uid()
    OR
    public.get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager')
)
WITH CHECK (
    buyer_id = auth.uid()
    OR
    public.get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager')
);

-- -----------------------------------------------------------
-- 3. SERVICE_REQUESTS (Maintenance/Ops)
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view service requests" ON service_requests;
DROP POLICY IF EXISTS "Service requests manage" ON service_requests;
DROP POLICY IF EXISTS "service_request_select_isolation" ON service_requests;
DROP POLICY IF EXISTS "service_request_manage_isolation" ON service_requests;

CREATE POLICY "service_request_select_isolation" ON service_requests FOR SELECT
TO authenticated USING (
    requester_id = auth.uid()
    OR
    public.get_user_role()::TEXT IN ('admin', 'super_admin')
    OR
    location_id IN (
        SELECT id FROM company_locations
        WHERE society_id IN (SELECT public.get_my_managed_societies())
    )
);

CREATE POLICY "service_request_manage_isolation" ON service_requests FOR ALL
TO authenticated USING (
    public.get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager', 'site_supervisor')
)
WITH CHECK (
    public.get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager', 'site_supervisor')
);

-- -----------------------------------------------------------
-- 4. CHECKLIST_RESPONSES
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Checklist responses manage" ON checklist_responses;
DROP POLICY IF EXISTS "checklist_response_select_isolation" ON checklist_responses;
DROP POLICY IF EXISTS "checklist_response_insert_isolation" ON checklist_responses;

CREATE POLICY "checklist_response_select_isolation" ON checklist_responses FOR SELECT
TO authenticated USING (
    public.get_user_role()::TEXT IN ('admin', 'super_admin')
    OR
    location_id IN (
        SELECT id FROM company_locations
        WHERE society_id IN (SELECT public.get_my_managed_societies())
    )
);

CREATE POLICY "checklist_response_insert_isolation" ON checklist_responses FOR INSERT
TO authenticated WITH CHECK (
    location_id IN (
        SELECT id FROM company_locations
        WHERE society_id IN (SELECT public.get_my_managed_societies())
    )
);
