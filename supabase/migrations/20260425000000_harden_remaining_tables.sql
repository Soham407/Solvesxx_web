-- ============================================
-- Migration: 20260425000000_harden_remaining_tables
-- Description: Final RLS hardening for operational and inventory tables
-- ============================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. QR_CODES
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "View QR Codes" ON qr_codes;
DROP POLICY IF EXISTS "Update QR Codes" ON qr_codes;
DROP POLICY IF EXISTS "qr_codes_select_isolation" ON qr_codes;
DROP POLICY IF EXISTS "qr_codes_update_isolation" ON qr_codes;

CREATE POLICY "qr_codes_select_isolation" ON qr_codes FOR SELECT
TO authenticated USING (
    society_id IN (SELECT public.get_my_managed_societies())
);

CREATE POLICY "qr_codes_update_isolation" ON qr_codes FOR UPDATE
TO authenticated USING (
    society_id IN (SELECT public.get_my_managed_societies())
    AND 
    public.get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager')
)
WITH CHECK (
    society_id IN (SELECT public.get_my_managed_societies())
    AND 
    public.get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager')
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. ASSETS
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "View Assets" ON assets;
DROP POLICY IF EXISTS "assets_select_isolation" ON assets;

CREATE POLICY "assets_select_isolation" ON assets FOR SELECT
TO authenticated USING (
    society_id IN (SELECT public.get_my_managed_societies())
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. WAREHOUSES
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "View Warehouses" ON warehouses;
DROP POLICY IF EXISTS "warehouses_select_isolation" ON warehouses;

CREATE POLICY "warehouses_select_isolation" ON warehouses FOR SELECT
TO authenticated USING (
    society_id IN (SELECT public.get_my_managed_societies())
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. STOCK_BATCHES
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "View Stock Batches" ON stock_batches;
DROP POLICY IF EXISTS "stock_batches_select_isolation" ON stock_batches;

CREATE POLICY "stock_batches_select_isolation" ON stock_batches FOR SELECT
TO authenticated USING (
    warehouse_id IN (
        SELECT id FROM warehouses 
        WHERE society_id IN (SELECT public.get_my_managed_societies())
    )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. MAINTENANCE_SCHEDULES
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "View Maintenance Schedules" ON maintenance_schedules;
DROP POLICY IF EXISTS "maintenance_schedules_select_isolation" ON maintenance_schedules;

CREATE POLICY "maintenance_schedules_select_isolation" ON maintenance_schedules FOR SELECT
TO authenticated USING (
    asset_id IN (
        SELECT id FROM assets 
        WHERE society_id IN (SELECT public.get_my_managed_societies())
    )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. COMPANY_EVENTS
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "All authenticated can view events" ON company_events;
DROP POLICY IF EXISTS "company_events_select_isolation" ON company_events;

CREATE POLICY "company_events_select_isolation" ON company_events FOR SELECT
TO authenticated USING (
    location_id IN (
        SELECT id FROM company_locations 
        WHERE society_id IN (SELECT public.get_my_managed_societies())
    )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. PERSONNEL_DISPATCHES
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "dispatches_select" ON personnel_dispatches;
DROP POLICY IF EXISTS "dispatches_update" ON personnel_dispatches;
DROP POLICY IF EXISTS "personnel_dispatches_select_isolation" ON personnel_dispatches;
DROP POLICY IF EXISTS "personnel_dispatches_update_isolation" ON personnel_dispatches;

CREATE POLICY "personnel_dispatches_select_isolation" ON personnel_dispatches FOR SELECT
TO authenticated USING (
    deployment_site_id IN (
        SELECT id FROM company_locations 
        WHERE society_id IN (SELECT public.get_my_managed_societies())
    )
);

CREATE POLICY "personnel_dispatches_update_isolation" ON personnel_dispatches FOR UPDATE
TO authenticated USING (
    public.get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager')
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. JOB_MATERIALS_USED
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "View Job Materials" ON job_materials_used;
DROP POLICY IF EXISTS "job_materials_used_select_isolation" ON job_materials_used;

CREATE POLICY "job_materials_used_select_isolation" ON job_materials_used FOR SELECT
TO authenticated USING (
    job_session_id IN (
        SELECT js.id FROM job_sessions js
        JOIN service_requests sr ON js.service_request_id = sr.id
        WHERE sr.location_id IN (
            SELECT id FROM company_locations 
            WHERE society_id IN (SELECT public.get_my_managed_societies())
        )
    )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. JOB_PHOTOS
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "View Job Photos" ON job_photos;
DROP POLICY IF EXISTS "job_photos_select_isolation" ON job_photos;

CREATE POLICY "job_photos_select_isolation" ON job_photos FOR SELECT
TO authenticated USING (
    job_session_id IN (
        SELECT js.id FROM job_sessions js
        JOIN service_requests sr ON js.service_request_id = sr.id
        WHERE sr.location_id IN (
            SELECT id FROM company_locations 
            WHERE society_id IN (SELECT public.get_my_managed_societies())
        )
    )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 10. TECHNICIAN_PROFILES
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "View Technician Profiles" ON technician_profiles;
DROP POLICY IF EXISTS "technician_profiles_select_isolation" ON technician_profiles;

CREATE POLICY "technician_profiles_select_isolation" ON technician_profiles FOR SELECT
TO authenticated USING (
    public.get_user_role()::TEXT IN ('admin', 'super_admin')
    OR
    employee_id IN (SELECT public.get_employee_ids_in_managed_societies())
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 11. SHORTAGE_NOTES
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "shortage_notes_select" ON shortage_notes;
DROP POLICY IF EXISTS "shortage_notes_update" ON shortage_notes;
DROP POLICY IF EXISTS "shortage_notes_select_isolation" ON shortage_notes;

CREATE POLICY "shortage_notes_select_isolation" ON shortage_notes FOR SELECT
TO authenticated USING (
    po_id IN (
        SELECT po.id FROM purchase_orders po
        JOIN indents i ON po.indent_id = i.id
        WHERE i.society_id IN (SELECT public.get_my_managed_societies())
    )
    OR
    public.get_user_role()::TEXT IN ('admin', 'super_admin', 'account', 'company_md')
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 12. SHORTAGE_NOTE_ITEMS
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "shortage_note_items_select" ON shortage_note_items;
DROP POLICY IF EXISTS "shortage_note_items_select_isolation" ON shortage_note_items;

CREATE POLICY "shortage_note_items_select_isolation" ON shortage_note_items FOR SELECT
TO authenticated USING (
    shortage_note_id IN (
        SELECT id FROM shortage_notes
        -- shortage_notes already filtered above
        WHERE true
    )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 13. SERVICE_DELIVERY_NOTES
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_delivery_notes_select" ON service_delivery_notes;
DROP POLICY IF EXISTS "service_delivery_notes_update" ON service_delivery_notes;

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

CREATE POLICY "horticulture_zones_select_isolation" ON horticulture_zones FOR SELECT
TO authenticated USING (
    society_id IN (SELECT public.get_my_managed_societies())
);

CREATE POLICY "horticulture_tasks_select_isolation" ON horticulture_tasks FOR SELECT
TO authenticated USING (
    zone_id IN (
        SELECT id FROM horticulture_zones
        WHERE society_id IN (SELECT public.get_my_managed_societies())
    )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 18. SERVICE_FEEDBACK
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service Feedback viewable by authenticated" ON service_feedback;

CREATE POLICY "service_feedback_select_isolation" ON service_feedback FOR SELECT
TO authenticated USING (
    society_id IN (SELECT public.get_my_managed_societies())
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 19. RTV_TICKETS
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "RTV Tickets viewable by authenticated" ON rtv_tickets;

CREATE POLICY "rtv_tickets_select_isolation" ON rtv_tickets FOR SELECT
TO authenticated USING (
    request_id IN (
        SELECT r.id FROM requests r
        WHERE r.location_id IN (
            SELECT id FROM company_locations 
            WHERE society_id IN (SELECT public.get_my_managed_societies())
        )
    )
);
