-- ============================================================================
-- RLS Policies: company_events, service_requests
-- company_events: RLS enabled, zero policies → residents/guards see no events.
-- service_requests: RLS enabled, existing policy covers employees+admins only;
--   residents can't read or create their own requests.
-- ============================================================================

-- ============================================================================
-- COMPANY EVENTS
-- Events are community-wide announcements. All authenticated users need SELECT.
-- Only admins/managers can create or modify events.
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view events" ON company_events;
CREATE POLICY "Authenticated users can view events" ON company_events FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage events" ON company_events;
CREATE POLICY "Admins can manage events" ON company_events FOR ALL
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager'));

-- ============================================================================
-- SERVICE REQUESTS
-- Existing policy "Users can view their service requests" covers assigned
-- employees and admins (FOR SELECT only). Residents are missing from both
-- SELECT and INSERT.
-- Add requester_id = auth.uid() as a SELECT condition, and an INSERT policy
-- so residents can submit new requests for their own flat/account.
-- ============================================================================

DROP POLICY IF EXISTS "Requesters can view their own service requests" ON service_requests;
CREATE POLICY "Requesters can view their own service requests" ON service_requests FOR SELECT
TO authenticated
USING (requester_id = auth.uid());

DROP POLICY IF EXISTS "Residents can create service requests" ON service_requests;
CREATE POLICY "Residents can create service requests" ON service_requests FOR INSERT
TO authenticated
WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage service requests" ON service_requests;
CREATE POLICY "Admins can manage service requests" ON service_requests FOR ALL
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager'));
