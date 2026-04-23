-- ============================================================================
-- RLS Policies: residents, visitors
-- Previous migration (20260207035202) used is_guard()/has_role() helpers that
-- don't exist in the live DB — those CREATE POLICY calls failed silently.
-- This migration rewrites all policies using get_user_role()::TEXT only.
--
-- Key fix for visitors: resident SELECT covers both flat_id AND resident_id,
-- because useResident.ts queries .eq("resident_id", ...) not .eq("flat_id", ...).
-- ============================================================================

-- ============================================================================
-- RESIDENTS
-- ============================================================================

DROP POLICY IF EXISTS "Residents can view their own record" ON residents;
CREATE POLICY "Residents can view their own record" ON residents FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Residents can update their own record" ON residents;
CREATE POLICY "Residents can update their own record" ON residents FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Guards can view residents" ON residents;
CREATE POLICY "Guards can view residents" ON residents FOR SELECT
TO authenticated
USING (get_user_role()::TEXT IN ('security_guard', 'security_supervisor'));

DROP POLICY IF EXISTS "Supervisors can view all residents" ON residents;
CREATE POLICY "Supervisors can view all residents" ON residents FOR SELECT
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor', 'society_manager'));

DROP POLICY IF EXISTS "Admins can manage residents" ON residents;
CREATE POLICY "Admins can manage residents" ON residents FOR ALL
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager'));

-- ============================================================================
-- VISITORS
-- SELECT: residents see visitors by flat_id OR resident_id (hook uses resident_id)
-- INSERT: guards check in new visitors; residents pre-invite via RPC (SECURITY DEFINER)
-- UPDATE: guards check out; residents toggle frequent status (by flat_id)
-- DELETE: residents can cancel a pre-invite within 5 minutes
-- ============================================================================

DROP POLICY IF EXISTS "Residents can view their flat visitors" ON visitors;
CREATE POLICY "Residents can view their flat visitors" ON visitors FOR SELECT
TO authenticated
USING (
  flat_id IN (SELECT flat_id FROM residents WHERE auth_user_id = auth.uid())
  OR resident_id IN (SELECT id FROM residents WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Residents can invite visitors" ON visitors;
CREATE POLICY "Residents can invite visitors" ON visitors FOR INSERT
TO authenticated
WITH CHECK (
  flat_id IN (SELECT flat_id FROM residents WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Residents can update their flat visitors" ON visitors;
CREATE POLICY "Residents can update their flat visitors" ON visitors FOR UPDATE
TO authenticated
USING (
  flat_id IN (SELECT flat_id FROM residents WHERE auth_user_id = auth.uid())
  OR resident_id IN (SELECT id FROM residents WHERE auth_user_id = auth.uid())
)
WITH CHECK (
  flat_id IN (SELECT flat_id FROM residents WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Residents can delete their flat visitors" ON visitors;
CREATE POLICY "Residents can delete their flat visitors" ON visitors FOR DELETE
TO authenticated
USING (
  flat_id IN (SELECT flat_id FROM residents WHERE auth_user_id = auth.uid())
  AND (entry_time IS NULL OR entry_time > (NOW() - INTERVAL '5 minutes'))
);

DROP POLICY IF EXISTS "Guards can view all visitors" ON visitors;
CREATE POLICY "Guards can view all visitors" ON visitors FOR SELECT
TO authenticated
USING (get_user_role()::TEXT IN ('security_guard', 'security_supervisor', 'admin', 'super_admin', 'society_manager'));

DROP POLICY IF EXISTS "Guards can check in visitors" ON visitors;
CREATE POLICY "Guards can check in visitors" ON visitors FOR INSERT
TO authenticated
WITH CHECK (get_user_role()::TEXT IN ('security_guard', 'security_supervisor', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "Guards can update visitors" ON visitors;
CREATE POLICY "Guards can update visitors" ON visitors FOR UPDATE
TO authenticated
USING (get_user_role()::TEXT IN ('security_guard', 'security_supervisor', 'admin', 'super_admin'))
WITH CHECK (get_user_role()::TEXT IN ('security_guard', 'security_supervisor', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "Supervisors can view all visitors" ON visitors;
-- (covered by "Guards can view all visitors" above)

DROP POLICY IF EXISTS "Admins can manage visitors" ON visitors;
CREATE POLICY "Admins can manage visitors" ON visitors FOR ALL
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager'));
