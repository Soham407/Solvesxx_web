-- ============================================
-- Migration: 20260424095000_harden_low_risk_rls
-- Description: Harden societies, buildings, flats, company_locations
-- Pattern: SELECT scoped by society; INSERT/UPDATE/DELETE restricted to Admin.
-- ============================================

-- -----------------------------------------------------------
-- 1. SOCIETIES
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view societies" ON societies;
DROP POLICY IF EXISTS "Admins can manage societies" ON societies;
DROP POLICY IF EXISTS "society_select_isolation" ON societies;
DROP POLICY IF EXISTS "society_insert_admin" ON societies;
DROP POLICY IF EXISTS "society_update_admin" ON societies;
DROP POLICY IF EXISTS "society_delete_admin" ON societies;

CREATE POLICY "society_select_isolation" ON societies FOR SELECT
TO authenticated USING (id IN (SELECT public.get_my_managed_societies()));

CREATE POLICY "society_insert_admin" ON societies FOR INSERT
TO authenticated WITH CHECK (public.get_user_role()::TEXT IN ('admin', 'super_admin'));

CREATE POLICY "society_update_admin" ON societies FOR UPDATE
TO authenticated USING (public.get_user_role()::TEXT IN ('admin', 'super_admin'))
WITH CHECK (public.get_user_role()::TEXT IN ('admin', 'super_admin'));

CREATE POLICY "society_delete_admin" ON societies FOR DELETE
TO authenticated USING (public.get_user_role()::TEXT IN ('admin', 'super_admin'));

-- -----------------------------------------------------------
-- 2. BUILDINGS
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view buildings" ON buildings;
DROP POLICY IF EXISTS "Admins can manage buildings" ON buildings;
DROP POLICY IF EXISTS "building_select_isolation" ON buildings;
DROP POLICY IF EXISTS "building_insert_admin" ON buildings;
DROP POLICY IF EXISTS "building_update_admin" ON buildings;
DROP POLICY IF EXISTS "building_delete_admin" ON buildings;

CREATE POLICY "building_select_isolation" ON buildings FOR SELECT
TO authenticated USING (society_id IN (SELECT public.get_my_managed_societies()));

CREATE POLICY "building_insert_admin" ON buildings FOR INSERT
TO authenticated WITH CHECK (public.get_user_role()::TEXT IN ('admin', 'super_admin'));

CREATE POLICY "building_update_admin" ON buildings FOR UPDATE
TO authenticated USING (public.get_user_role()::TEXT IN ('admin', 'super_admin'))
WITH CHECK (public.get_user_role()::TEXT IN ('admin', 'super_admin'));

CREATE POLICY "building_delete_admin" ON buildings FOR DELETE
TO authenticated USING (public.get_user_role()::TEXT IN ('admin', 'super_admin'));

-- -----------------------------------------------------------
-- 3. FLATS
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view flats" ON flats;
DROP POLICY IF EXISTS "Admins can manage flats" ON flats;
DROP POLICY IF EXISTS "flat_select_isolation" ON flats;
DROP POLICY IF EXISTS "flat_insert_admin" ON flats;
DROP POLICY IF EXISTS "flat_update_admin" ON flats;
DROP POLICY IF EXISTS "flat_delete_admin" ON flats;

CREATE POLICY "flat_select_isolation" ON flats FOR SELECT
TO authenticated USING (
    building_id IN (
        SELECT id FROM buildings 
        WHERE society_id IN (SELECT public.get_my_managed_societies())
    )
);

CREATE POLICY "flat_insert_admin" ON flats FOR INSERT
TO authenticated WITH CHECK (public.get_user_role()::TEXT IN ('admin', 'super_admin'));

CREATE POLICY "flat_update_admin" ON flats FOR UPDATE
TO authenticated USING (public.get_user_role()::TEXT IN ('admin', 'super_admin'))
WITH CHECK (public.get_user_role()::TEXT IN ('admin', 'super_admin'));

CREATE POLICY "flat_delete_admin" ON flats FOR DELETE
TO authenticated USING (public.get_user_role()::TEXT IN ('admin', 'super_admin'));

-- -----------------------------------------------------------
-- 4. COMPANY_LOCATIONS
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view locations" ON company_locations;
DROP POLICY IF EXISTS "Admins can manage locations" ON company_locations;
DROP POLICY IF EXISTS "location_select_isolation" ON company_locations;
DROP POLICY IF EXISTS "location_insert_admin" ON company_locations;
DROP POLICY IF EXISTS "location_update_admin" ON company_locations;
DROP POLICY IF EXISTS "location_delete_admin" ON company_locations;

CREATE POLICY "location_select_isolation" ON company_locations FOR SELECT
TO authenticated USING (society_id IN (SELECT public.get_my_managed_societies()));

CREATE POLICY "location_insert_admin" ON company_locations FOR INSERT
TO authenticated WITH CHECK (public.get_user_role()::TEXT IN ('admin', 'super_admin'));

CREATE POLICY "location_update_admin" ON company_locations FOR UPDATE
TO authenticated USING (public.get_user_role()::TEXT IN ('admin', 'super_admin'))
WITH CHECK (public.get_user_role()::TEXT IN ('admin', 'super_admin'));

CREATE POLICY "location_delete_admin" ON company_locations FOR DELETE
TO authenticated USING (public.get_user_role()::TEXT IN ('admin', 'super_admin'));
