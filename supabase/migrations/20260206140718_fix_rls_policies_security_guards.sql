-- ============================================
-- Fix #5a: Fix RLS policies for security_guards
-- ============================================

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Guards can view their own record" ON security_guards;
DROP POLICY IF EXISTS "Guards can update their own record" ON security_guards;
DROP POLICY IF EXISTS "Admins can view all guards" ON security_guards;
DROP POLICY IF EXISTS "Admins can manage guards" ON security_guards;

-- Create correct policies
CREATE POLICY "Guards can view their own record"
ON security_guards FOR SELECT
USING (
  id = get_guard_id()
);

CREATE POLICY "Guards can update their own record"
ON security_guards FOR UPDATE
USING (id = get_guard_id())
WITH CHECK (id = get_guard_id());

-- Supervisors and admins can view all guards
CREATE POLICY "Supervisors can view all guards"
ON security_guards FOR SELECT
USING (
  has_role('admin') OR 
  has_role('security_supervisor') OR 
  has_role('society_manager')
);

-- Admins can manage all guard records
CREATE POLICY "Admins can manage guards"
ON security_guards FOR ALL
USING (has_role('admin'));;
