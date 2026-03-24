-- =============================================================================
-- Migration: 20260324000001_fix_society_security_rls_gaps.sql
-- Purpose:   Restore manager-side writes needed by the society/security module
--            without reopening broad unsafe client access.
-- =============================================================================

-- Society managers and security supervisors need to update visitor records for
-- pass issuance, helper tagging, and checkout actions surfaced in the society
-- visitors console.
DROP POLICY IF EXISTS "visitors_society_ops_update" ON visitors;
CREATE POLICY "visitors_society_ops_update" ON visitors
  FOR UPDATE TO authenticated
  USING (
    get_my_app_role() IN ('admin', 'super_admin', 'security_supervisor', 'society_manager')
  )
  WITH CHECK (
    get_my_app_role() IN ('admin', 'super_admin', 'security_supervisor', 'society_manager')
  );

-- Society managers can register residents from the family directory page.
DROP POLICY IF EXISTS "residents_society_manager_insert" ON residents;
CREATE POLICY "residents_society_manager_insert" ON residents
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_app_role() IN ('admin', 'super_admin', 'society_manager')
  );
