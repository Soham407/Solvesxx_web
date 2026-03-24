-- ============================================
-- Fix #5b: Fix RLS policies for panic_alerts
-- ============================================

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Guards can insert their own panic alerts" ON panic_alerts;
DROP POLICY IF EXISTS "Guards can view their own panic alerts" ON panic_alerts;
DROP POLICY IF EXISTS "Supervisors can view all panic alerts" ON panic_alerts;
DROP POLICY IF EXISTS "Supervisors can resolve panic alerts" ON panic_alerts;

-- Guards can only insert alerts for themselves
CREATE POLICY "Guards can insert their own panic alerts"
ON panic_alerts FOR INSERT
WITH CHECK (
  guard_id = get_guard_id()
);

-- Guards can view their own alerts
CREATE POLICY "Guards can view their own panic alerts"
ON panic_alerts FOR SELECT
USING (
  guard_id = get_guard_id()
);

-- Supervisors, managers, and admins can view all alerts
CREATE POLICY "Supervisors can view all panic alerts"
ON panic_alerts FOR SELECT
USING (
  has_role('admin') OR 
  has_role('security_supervisor') OR 
  has_role('society_manager')
);

-- Supervisors and managers can resolve alerts
CREATE POLICY "Supervisors can resolve panic alerts"
ON panic_alerts FOR UPDATE
USING (
  has_role('admin') OR 
  has_role('security_supervisor') OR 
  has_role('society_manager')
);;
