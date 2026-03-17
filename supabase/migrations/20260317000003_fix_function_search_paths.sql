-- =============================================================================
-- Migration: 20260317000003_fix_function_search_paths.sql
-- Purpose:   Add SET search_path = public, extensions to the 18 functions
--            that are missing it. Without a fixed search_path, a malicious
--            schema object could be injected to shadow trusted functions
--            (search_path injection / schema poisoning attack).
-- Severity:  MEDIUM (M1 in 2026-03-17 audit)
-- =============================================================================

-- Core RBAC/auth helpers (most critical — used inside RLS policies)
ALTER FUNCTION get_my_app_role()              SET search_path = public, extensions;
ALTER FUNCTION get_employee_id()              SET search_path = public, extensions;
ALTER FUNCTION get_guard_id()                 SET search_path = public, extensions;
ALTER FUNCTION get_user_role()                SET search_path = public, extensions;
ALTER FUNCTION is_guard()                     SET search_path = public, extensions;

-- Scheduled/background functions
ALTER FUNCTION auto_punch_out_idle_employees() SET search_path = public, extensions;

-- Sequence/number generation helpers
ALTER FUNCTION get_next_rtv_number()                  SET search_path = public, extensions;
ALTER FUNCTION generate_delivery_note_number()        SET search_path = public, extensions;
ALTER FUNCTION generate_ad_booking_number()           SET search_path = public, extensions;
ALTER FUNCTION generate_shortage_note_number()        SET search_path = public, extensions;
ALTER FUNCTION generate_dispatch_number()             SET search_path = public, extensions;

-- Trigger functions (updated_at / audit stamps)
ALTER FUNCTION update_updated_at_column()             SET search_path = public, extensions;
ALTER FUNCTION update_delivery_note_updated_at()      SET search_path = public, extensions;
ALTER FUNCTION update_bgv_updated_at()                SET search_path = public, extensions;
ALTER FUNCTION update_spill_kit_updated_at()          SET search_path = public, extensions;
ALTER FUNCTION update_ad_booking_updated_at()         SET search_path = public, extensions;
ALTER FUNCTION update_shortage_note_updated_at()      SET search_path = public, extensions;
ALTER FUNCTION update_dispatch_updated_at()           SET search_path = public, extensions;
