-- =============================================================================
-- Migration: 20260330000010_notify_001_notifications_hardening.sql
-- Purpose:   Preserve the server-side notification insert path on environments
--            that already applied the March 16/17 notifications migrations.
-- =============================================================================

DROP POLICY IF EXISTS "notifications_insert_service_role" ON notifications;
CREATE POLICY "notifications_insert_service_role" ON notifications
  FOR INSERT TO service_role
  WITH CHECK (true);
