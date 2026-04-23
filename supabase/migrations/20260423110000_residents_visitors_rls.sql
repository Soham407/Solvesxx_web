-- ============================================================================
-- RLS Policies: residents, visitors
-- Both tables have RLS enabled but no resident-facing policies in the live DB.
-- Ported from PhaseA archive, replacing is_guard()/has_role() with
-- get_user_role()::TEXT which is the only role helper in the live schema.
-- ============================================================================

-- ============================================================================
-- RESIDENTS
-- ============================================================================

DROP POLICY IF EXISTS "Residents can view their own record" ON residents;
CREATE POLICY "Residents can view their own record" ON residents FOR SELECT
TO authenticated USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Residents can update their own record" ON residents;
CREATE POLICY "Residents can update their own record" ON residents FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Guards can view residents" ON residents;
CREATE POLICY "Guards can view residents" ON residents FOR SELECT
TO authenticated USING (get_user_role()::TEXT IN ('security_guard', 'security_supervisor'));

DROP POLICY IF EXISTS "Supervisors can view all residents" ON residents;
CREATE POLICY "Supervisors can view all residents" ON residents FOR SELECT
TO authenticated USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor', 'society_manager'));

DROP POLICY IF EXISTS "Admins can manage residents" ON residents;
CREATE POLICY "Admins can manage residents" ON residents FOR ALL
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin'));

-- ============================================================================
-- VISITORS (resident-side policies — guard side already exists as "Guards can manage visitors")
-- ============================================================================

-- Residents can see all visitors for their flat
DROP POLICY IF EXISTS "Residents can view their flat visitors" ON visitors;
CREATE POLICY "Residents can view their flat visitors" ON visitors FOR SELECT
TO authenticated
USING (flat_id IN (
  SELECT flat_id FROM residents WHERE auth_user_id = auth.uid() AND is_active = true
));

-- Residents can pre-invite (INSERT) visitors into their own flat
DROP POLICY IF EXISTS "Residents can invite visitors" ON visitors;
CREATE POLICY "Residents can invite visitors" ON visitors FOR INSERT
TO authenticated
WITH CHECK (
  flat_id IN (
    SELECT flat_id FROM residents WHERE auth_user_id = auth.uid() AND is_active = true
  )
);

-- Residents can update visitors at their flat (approve/deny, mark frequent)
DROP POLICY IF EXISTS "Residents can update their flat visitors" ON visitors;
CREATE POLICY "Residents can update their flat visitors" ON visitors FOR UPDATE
TO authenticated
USING (
  flat_id IN (
    SELECT flat_id FROM residents WHERE auth_user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  flat_id IN (
    SELECT flat_id FROM residents WHERE auth_user_id = auth.uid() AND is_active = true
  )
);
