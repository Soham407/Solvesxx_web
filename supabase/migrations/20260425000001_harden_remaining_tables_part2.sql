-- ============================================
-- Migration: 20260425000001_harden_remaining_tables_part2
-- Description: Additional RLS hardening for service and specialized tables
-- ============================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 13. SERVICE_DELIVERY_NOTES
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_delivery_notes_select" ON service_delivery_notes;
DROP POLICY IF EXISTS "service_delivery_notes_update" ON service_delivery_notes;
DROP POLICY IF EXISTS "service_delivery_notes_select_isolation" ON service_delivery_notes;

CREATE POLICY "service_delivery_notes_select_isolation" ON service_delivery_notes FOR SELECT
TO authenticated USING (
    po_id IN (
        SELECT po.id FROM purchase_orders po
        JOIN indents i ON po.indent_id = i.id
        WHERE i.society_id IN (SELECT public.get_my_managed_societies())
    )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 14. AD_BOOKINGS
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Ad Bookings viewable by authenticated" ON printing_ad_bookings;
DROP POLICY IF EXISTS "Ad Bookings manageable by staff" ON printing_ad_bookings;
DROP POLICY IF EXISTS "ad_bookings_select_isolation" ON printing_ad_bookings;

CREATE POLICY "ad_bookings_select_isolation" ON printing_ad_bookings FOR SELECT
TO authenticated USING (
    ad_space_id IN (
        SELECT ads.id FROM printing_ad_spaces ads
        JOIN assets a ON ads.asset_id = a.id
        WHERE a.society_id IN (SELECT public.get_my_managed_societies())
    )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 15. BACKGROUND_VERIFICATIONS
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Background Verifications viewable by staff" ON background_verifications;
DROP POLICY IF EXISTS "Background Verifications manageable by staff" ON background_verifications;
DROP POLICY IF EXISTS "bgv_select_isolation" ON background_verifications;

CREATE POLICY "bgv_select_isolation" ON background_verifications FOR SELECT
TO authenticated USING (
    employee_id IN (SELECT public.get_employee_ids_in_managed_societies())
    OR
    public.get_user_role()::TEXT IN ('admin', 'super_admin')
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 16. SPILL_KITS
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Spill Kits viewable by authenticated" ON pest_control_spill_kits;
DROP POLICY IF EXISTS "Spill Kits manageable by staff" ON pest_control_spill_kits;
DROP POLICY IF EXISTS "spill_kits_select_isolation" ON pest_control_spill_kits;

CREATE POLICY "spill_kits_select_isolation" ON pest_control_spill_kits FOR SELECT
TO authenticated USING (
    location_id IN (
        SELECT id FROM company_locations 
        WHERE society_id IN (SELECT public.get_my_managed_societies())
    )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 17. HORTICULTURE
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Horticulture Zones viewable by authenticated" ON horticulture_zones;
DROP POLICY IF EXISTS "Horticulture Tasks viewable by authenticated" ON horticulture_tasks;
DROP POLICY IF EXISTS "horticulture_zones_select_isolation" ON horticulture_zones;
DROP POLICY IF EXISTS "horticulture_tasks_select_isolation" ON horticulture_tasks;

CREATE POLICY "horticulture_zones_select_isolation" ON horticulture_zones FOR SELECT
TO authenticated USING (
    location_id IN (
        SELECT id FROM company_locations 
        WHERE society_id IN (SELECT public.get_my_managed_societies())
    )
);

CREATE POLICY "horticulture_tasks_select_isolation" ON horticulture_tasks FOR SELECT
TO authenticated USING (
    zone_id IN (
        SELECT id FROM horticulture_zones
        WHERE location_id IN (
            SELECT id FROM company_locations 
            WHERE society_id IN (SELECT public.get_my_managed_societies())
        )
    )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 18. SERVICE_FEEDBACK
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service Feedback viewable by authenticated" ON service_feedback;
DROP POLICY IF EXISTS "service_feedback_select_isolation" ON service_feedback;

CREATE POLICY "service_feedback_select_isolation" ON service_feedback FOR SELECT
TO authenticated USING (
    society_id IN (SELECT public.get_my_managed_societies())
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 19. RTV_TICKETS
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated read on rtv_tickets" ON rtv_tickets;
DROP POLICY IF EXISTS "Allow authenticated insert on rtv_tickets" ON rtv_tickets;
DROP POLICY IF EXISTS "Allow authenticated update on rtv_tickets" ON rtv_tickets;
DROP POLICY IF EXISTS "rtv_tickets_select_isolation" ON rtv_tickets;

CREATE POLICY "rtv_tickets_select_isolation" ON rtv_tickets FOR SELECT
TO authenticated USING (
    po_id IN (
        SELECT po.id FROM purchase_orders po
        JOIN indents i ON po.indent_id = i.id
        WHERE i.society_id IN (SELECT public.get_my_managed_societies())
    )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 20. PPE VERIFICATIONS
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "PPE Verifications viewable by staff" ON pest_control_ppe_verifications;
DROP POLICY IF EXISTS "PPE Verifications manageable by staff" ON pest_control_ppe_verifications;
DROP POLICY IF EXISTS "ppe_verifications_select_isolation" ON pest_control_ppe_verifications;

CREATE POLICY "ppe_verifications_select_isolation" ON pest_control_ppe_verifications FOR SELECT
TO authenticated USING (
    service_request_id IN (
        SELECT id FROM service_requests 
        WHERE location_id IN (
            SELECT id FROM company_locations 
            WHERE society_id IN (SELECT public.get_my_managed_societies())
        )
    )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 21. AD SPACES
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Ad Spaces viewable by authenticated" ON printing_ad_spaces;
DROP POLICY IF EXISTS "Ad Spaces manageable by staff" ON printing_ad_spaces;
DROP POLICY IF EXISTS "ad_spaces_select_isolation" ON printing_ad_spaces;

CREATE POLICY "ad_spaces_select_isolation" ON printing_ad_spaces FOR SELECT
TO authenticated USING (
    asset_id IN (
        SELECT id FROM assets 
        WHERE society_id IN (SELECT public.get_my_managed_societies())
    )
);
