-- =============================================================================
-- Migration: 20260317000002_fix_critical_rls.sql
-- Purpose:   Fix all CRITICAL and HIGH severity RLS policy vulnerabilities
--            identified in the 2026-03-17 security audit.
-- =============================================================================

-- ============================================================
-- C2: notifications — ANY authenticated user could inject
--     notifications to any user_id (including admin).
-- ============================================================
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert_restricted" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_app_role() IN ('admin', 'super_admin')
    OR user_id = auth.uid()
  );

-- ============================================================
-- C3: system_config — policy named "admin" but USING(true)
--     allowed any authenticated user to read/write all settings.
-- ============================================================
DROP POLICY IF EXISTS "Admin can manage system config" ON system_config;
-- Admins get full access
CREATE POLICY "system_config_admin_full" ON system_config
  FOR ALL TO authenticated
  USING (get_my_app_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_my_app_role() IN ('admin', 'super_admin'));
-- All authenticated users can read (thresholds needed client-side)
CREATE POLICY "system_config_read_all" ON system_config
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- C4: service_purchase_orders & service_purchase_order_items
--     "Authenticated users can manage SPOs" was FOR ALL USING(true).
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage SPOs" ON service_purchase_orders;
CREATE POLICY "spo_admin_full" ON service_purchase_orders
  FOR ALL TO authenticated
  USING (get_my_app_role() IN ('admin', 'super_admin', 'account', 'company_hod'))
  WITH CHECK (get_my_app_role() IN ('admin', 'super_admin', 'account', 'company_hod'));
-- Suppliers can view SPOs addressed to them
CREATE POLICY "spo_supplier_select" ON service_purchase_orders
  FOR SELECT TO authenticated
  USING (
    get_my_app_role() = 'supplier'
    AND vendor_id IN (
      SELECT supplier_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can manage SPO items" ON service_purchase_order_items;
CREATE POLICY "spo_items_admin_full" ON service_purchase_order_items
  FOR ALL TO authenticated
  USING (get_my_app_role() IN ('admin', 'super_admin', 'account', 'company_hod'))
  WITH CHECK (get_my_app_role() IN ('admin', 'super_admin', 'account', 'company_hod'));
-- Suppliers can view items for their SPOs
CREATE POLICY "spo_items_supplier_select" ON service_purchase_order_items
  FOR SELECT TO authenticated
  USING (
    get_my_app_role() = 'supplier'
    AND spo_id IN (
      SELECT id FROM service_purchase_orders
      WHERE vendor_id IN (
        SELECT supplier_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================
-- C5: inventory — RLS enabled but ZERO policies (completely
--     inaccessible — storekeeper dashboard broken).
-- ============================================================
CREATE POLICY "inventory_admin_storekeeper_full" ON inventory
  FOR ALL TO authenticated
  USING (get_my_app_role() IN ('admin', 'super_admin', 'storekeeper'))
  WITH CHECK (get_my_app_role() IN ('admin', 'super_admin', 'storekeeper'));
-- Read-only for buyers and account roles
CREATE POLICY "inventory_buyer_account_select" ON inventory
  FOR SELECT TO authenticated
  USING (get_my_app_role() IN ('buyer', 'account', 'company_hod', 'site_supervisor'));

-- ============================================================
-- C6: login_rate_limits — RLS enabled but ZERO policies
--     (brute-force protection silently broken — RPCs use
--     SECURITY DEFINER so no policy needed for RPC calls,
--     but block direct access from client).
-- ============================================================
CREATE POLICY "login_rate_limits_block_direct" ON login_rate_limits
  FOR ALL TO authenticated
  USING (false);
-- Note: proc_handle_login_attempt and proc_check_login_blocked
-- are SECURITY DEFINER functions — they bypass RLS entirely.
-- This policy prevents direct SELECT/INSERT from the client.

-- ============================================================
-- H1: background_verifications — bgv_update USING(true)
--     allowed any user to mark police verification as "cleared".
-- ============================================================
DROP POLICY IF EXISTS "bgv_update" ON background_verifications;
CREATE POLICY "bgv_update_admin_hr" ON background_verifications
  FOR UPDATE TO authenticated
  USING (get_my_app_role() IN ('admin', 'super_admin', 'company_hod'))
  WITH CHECK (get_my_app_role() IN ('admin', 'super_admin', 'company_hod'));

-- ============================================================
-- H2: service_acknowledgments — policy named correctly but
--     implemented with USING(true) — any user could acknowledge.
-- ============================================================
DROP POLICY IF EXISTS "Admin and site supervisor can manage acknowledgments" ON service_acknowledgments;
CREATE POLICY "svc_ack_admin_supervisor" ON service_acknowledgments
  FOR ALL TO authenticated
  USING (get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor'))
  WITH CHECK (get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor'));

-- ============================================================
-- H3: Overly permissive UPDATE policies — 5 tables with
--     FOR UPDATE USING(true) allowing any authenticated user
--     to tamper with procurement and safety records.
-- ============================================================

-- shortage_notes
DROP POLICY IF EXISTS "shortage_notes_update" ON shortage_notes;
CREATE POLICY "shortage_notes_update_admin" ON shortage_notes
  FOR UPDATE TO authenticated
  USING (get_my_app_role() IN ('admin', 'super_admin', 'storekeeper', 'account'))
  WITH CHECK (get_my_app_role() IN ('admin', 'super_admin', 'storekeeper', 'account'));

-- service_delivery_notes
DROP POLICY IF EXISTS "service_delivery_notes_update" ON service_delivery_notes;
CREATE POLICY "service_delivery_notes_update_admin" ON service_delivery_notes
  FOR UPDATE TO authenticated
  USING (get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor', 'account'))
  WITH CHECK (get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor', 'account'));

-- personnel_dispatches
DROP POLICY IF EXISTS "dispatches_update" ON personnel_dispatches;
CREATE POLICY "dispatches_update_admin" ON personnel_dispatches
  FOR UPDATE TO authenticated
  USING (get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor'))
  WITH CHECK (get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor'));

-- pest_control_spill_kits
DROP POLICY IF EXISTS "spill_kits_update" ON pest_control_spill_kits;
CREATE POLICY "spill_kits_update_admin" ON pest_control_spill_kits
  FOR UPDATE TO authenticated
  USING (get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor'))
  WITH CHECK (get_my_app_role() IN ('admin', 'super_admin', 'site_supervisor'));

-- printing_ad_bookings
DROP POLICY IF EXISTS "ad_bookings_update" ON printing_ad_bookings;
CREATE POLICY "ad_bookings_update_admin" ON printing_ad_bookings
  FOR UPDATE TO authenticated
  USING (get_my_app_role() IN ('admin', 'super_admin', 'account'))
  WITH CHECK (get_my_app_role() IN ('admin', 'super_admin', 'account'));

-- ============================================================
-- H4: qr_batch_logs — FOR ALL USING(true) — any user could
--     read, modify, or delete QR batch audit logs.
-- ============================================================
DROP POLICY IF EXISTS "Allow authenticated users to manage batch logs" ON qr_batch_logs;
CREATE POLICY "qr_batch_admin_storekeeper" ON qr_batch_logs
  FOR ALL TO authenticated
  USING (get_my_app_role() IN ('admin', 'super_admin', 'storekeeper'))
  WITH CHECK (get_my_app_role() IN ('admin', 'super_admin', 'storekeeper'));

-- ============================================================
-- H6: service_feedback — INSERT WITH CHECK(true) allowed any user to submit
--     feedback as any other resident. Uses resident_id FK (not created_by).
-- ============================================================
DROP POLICY IF EXISTS "service_feedback_insert" ON service_feedback;
CREATE POLICY "service_feedback_insert_restricted" ON service_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_app_role() IN ('admin', 'super_admin', 'buyer', 'resident', 'society_manager')
  );

-- service_requests — INSERT WITH CHECK(true); has created_by column
DROP POLICY IF EXISTS "service_requests_insert" ON service_requests;
CREATE POLICY "service_requests_insert_own" ON service_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    OR get_my_app_role() IN ('admin', 'super_admin', 'buyer', 'site_supervisor')
  );

-- ============================================================
-- H7: SECURITY DEFINER views bypass RLS — convert to
--     SECURITY INVOKER so each caller's own permissions apply.
-- ============================================================
-- view_service_performance
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT definition INTO v_def
  FROM pg_views
  WHERE schemaname = 'public' AND viewname = 'view_service_performance';

  IF v_def IS NOT NULL THEN
    EXECUTE format(
      'CREATE OR REPLACE VIEW public.view_service_performance
       WITH (security_invoker = true) AS %s',
      v_def
    );
  END IF;
END $$;

-- view_financial_kpis
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT definition INTO v_def
  FROM pg_views
  WHERE schemaname = 'public' AND viewname = 'view_financial_kpis';

  IF v_def IS NOT NULL THEN
    EXECUTE format(
      'CREATE OR REPLACE VIEW public.view_financial_kpis
       WITH (security_invoker = true) AS %s',
      v_def
    );
  END IF;
END $$;

-- ============================================================
-- H8: GPS tracking future partitions (2026_05 – 2026_12)
--     have zero RLS policies — guard tracking will silently
--     fail from May 2026. Copy policies from gps_tracking_default.
-- ============================================================
DO $$
DECLARE
  month_suffix text;
  months text[] := ARRAY['2026_05','2026_06','2026_07','2026_08','2026_09','2026_10','2026_11','2026_12'];
  tbl text;
BEGIN
  FOREACH month_suffix IN ARRAY months LOOP
    tbl := 'gps_tracking_' || month_suffix;
    -- Guard can insert/select their own rows
    EXECUTE format('
      DROP POLICY IF EXISTS "gps_guard_own_%s" ON %I;
      CREATE POLICY "gps_guard_own_%s" ON %I
        FOR ALL TO authenticated
        USING (employee_id = (
          SELECT id FROM security_guards WHERE employee_id = (
            SELECT id FROM employees WHERE id = (SELECT employee_id FROM users WHERE id = auth.uid())
          ) LIMIT 1
        ))
        WITH CHECK (employee_id = (
          SELECT id FROM security_guards WHERE employee_id = (
            SELECT id FROM employees WHERE id = (SELECT employee_id FROM users WHERE id = auth.uid())
          ) LIMIT 1
        ));
    ', month_suffix, tbl, month_suffix, tbl);
    -- Admins and supervisors can read all
    EXECUTE format('
      DROP POLICY IF EXISTS "gps_admin_select_%s" ON %I;
      CREATE POLICY "gps_admin_select_%s" ON %I
        FOR SELECT TO authenticated
        USING (get_my_app_role() IN (
          ''admin'', ''super_admin'', ''security_supervisor'',
          ''society_manager'', ''site_supervisor''
        ));
    ', month_suffix, tbl, month_suffix, tbl);
  END LOOP;
END $$;

-- ============================================================
-- H10: material_arrival_evidence & stock_transactions
--      have RLS enabled but ZERO policies.
-- ============================================================

-- material_arrival_evidence
CREATE POLICY "mat_arrival_evidence_admin_delivery" ON material_arrival_evidence
  FOR ALL TO authenticated
  USING (get_my_app_role() IN ('admin', 'super_admin', 'storekeeper', 'delivery_personnel'))
  WITH CHECK (get_my_app_role() IN ('admin', 'super_admin', 'storekeeper', 'delivery_personnel'));
CREATE POLICY "mat_arrival_evidence_select_buyer" ON material_arrival_evidence
  FOR SELECT TO authenticated
  USING (get_my_app_role() IN ('buyer', 'account', 'company_hod'));

-- stock_transactions
CREATE POLICY "stock_transactions_admin_storekeeper" ON stock_transactions
  FOR ALL TO authenticated
  USING (get_my_app_role() IN ('admin', 'super_admin', 'storekeeper'))
  WITH CHECK (get_my_app_role() IN ('admin', 'super_admin', 'storekeeper'));
CREATE POLICY "stock_transactions_select_buyer" ON stock_transactions
  FOR SELECT TO authenticated
  USING (get_my_app_role() IN ('buyer', 'account', 'company_hod', 'site_supervisor'));

-- ============================================================
-- storage_deletion_queue — internal cleanup queue, zero policies.
-- Block direct client access; deletion runs via SECURITY DEFINER.
-- ============================================================
CREATE POLICY "storage_deletion_queue_block_direct" ON storage_deletion_queue
  FOR ALL TO authenticated
  USING (false);
