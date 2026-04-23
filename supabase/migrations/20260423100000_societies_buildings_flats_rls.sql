-- ============================================================================
-- RLS Policies: societies, buildings, flats
-- All three tables have RLS enabled but no policies — this adds them.
-- Uses get_user_role() which is already defined in the live schema.
-- ============================================================================

-- SOCIETIES
DROP POLICY IF EXISTS "Authenticated users can view societies" ON societies;
CREATE POLICY "Authenticated users can view societies" ON societies FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage societies" ON societies;
CREATE POLICY "Admins can manage societies" ON societies FOR ALL
TO authenticated USING (get_user_role()::TEXT IN ('admin', 'super_admin'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin'));

-- BUILDINGS
DROP POLICY IF EXISTS "Authenticated users can view buildings" ON buildings;
CREATE POLICY "Authenticated users can view buildings" ON buildings FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage buildings" ON buildings;
CREATE POLICY "Admins can manage buildings" ON buildings FOR ALL
TO authenticated USING (get_user_role()::TEXT IN ('admin', 'super_admin'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin'));

-- FLATS
DROP POLICY IF EXISTS "Authenticated users can view flats" ON flats;
CREATE POLICY "Authenticated users can view flats" ON flats FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage flats" ON flats;
CREATE POLICY "Admins can manage flats" ON flats FOR ALL
TO authenticated USING (get_user_role()::TEXT IN ('admin', 'super_admin'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin'));
