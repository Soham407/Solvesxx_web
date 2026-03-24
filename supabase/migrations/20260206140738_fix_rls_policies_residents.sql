-- ============================================
-- Fix #5c: Fix RLS policies for residents
-- ============================================

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Residents can view their own record" ON residents;
DROP POLICY IF EXISTS "Residents can update their own record" ON residents;
DROP POLICY IF EXISTS "Guards can view residents" ON residents;
DROP POLICY IF EXISTS "Admins can manage residents" ON residents;

-- Residents can view their own record using auth_user_id
CREATE POLICY "Residents can view their own record"
ON residents FOR SELECT
USING (
  auth_user_id = auth.uid()
);

-- Residents can update their own record
CREATE POLICY "Residents can update their own record"
ON residents FOR UPDATE
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Guards can view residents (for visitor verification)
CREATE POLICY "Guards can view residents"
ON residents FOR SELECT
USING (is_guard());

-- Supervisors and managers can view all residents
CREATE POLICY "Supervisors can view all residents"
ON residents FOR SELECT
USING (
  has_role('admin') OR 
  has_role('security_supervisor') OR 
  has_role('society_manager')
);

-- Admins can manage all resident records
CREATE POLICY "Admins can manage residents"
ON residents FOR ALL
USING (has_role('admin'));;
