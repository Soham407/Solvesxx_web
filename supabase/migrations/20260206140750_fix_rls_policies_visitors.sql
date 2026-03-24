-- ============================================
-- Fix #5d: Fix RLS policies for visitors
-- ============================================

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Residents can view their flat visitors" ON visitors;
DROP POLICY IF EXISTS "Residents can invite visitors" ON visitors;
DROP POLICY IF EXISTS "Guards can view all visitors" ON visitors;
DROP POLICY IF EXISTS "Guards can check in visitors" ON visitors;
DROP POLICY IF EXISTS "Guards can update visitors" ON visitors;
DROP POLICY IF EXISTS "Admins can manage visitors" ON visitors;

-- Residents can view visitors to their flat
CREATE POLICY "Residents can view their flat visitors"
ON visitors FOR SELECT
USING (
  flat_id IN (
    SELECT flat_id FROM residents WHERE auth_user_id = auth.uid()
  )
);

-- Residents can invite visitors (pre-approve)
CREATE POLICY "Residents can invite visitors"
ON visitors FOR INSERT
WITH CHECK (
  flat_id IN (
    SELECT flat_id FROM residents WHERE auth_user_id = auth.uid()
  )
  AND approved_by_resident = true
);

-- Guards can view all visitors
CREATE POLICY "Guards can view all visitors"
ON visitors FOR SELECT
USING (is_guard());

-- Guards can insert new visitors (walk-ins)
CREATE POLICY "Guards can check in visitors"
ON visitors FOR INSERT
WITH CHECK (is_guard());

-- Guards can update visitors (check-in/check-out)
CREATE POLICY "Guards can update visitors"
ON visitors FOR UPDATE
USING (is_guard());

-- Supervisors and managers can view all visitors
CREATE POLICY "Supervisors can view all visitors"
ON visitors FOR SELECT
USING (
  has_role('admin') OR 
  has_role('security_supervisor') OR 
  has_role('society_manager')
);

-- Admins can manage all visitor records
CREATE POLICY "Admins can manage visitors"
ON visitors FOR ALL
USING (has_role('admin'));;
