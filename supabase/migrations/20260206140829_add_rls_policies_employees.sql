-- ============================================
-- Fix #6: Add RLS policies for employees table
-- ============================================

-- Drop any existing policies
DROP POLICY IF EXISTS "Employees can view their own record" ON employees;
DROP POLICY IF EXISTS "Employees can update their own record" ON employees;
DROP POLICY IF EXISTS "Guards can view employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;

-- Employees can view their own record
CREATE POLICY "Employees can view their own record"
ON employees FOR SELECT
USING (auth_user_id = auth.uid());

-- Employees can update limited fields on their own record
CREATE POLICY "Employees can update their own record"
ON employees FOR UPDATE
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Guards can view other employees (for lookups)
CREATE POLICY "Guards can view employees"
ON employees FOR SELECT
USING (is_guard());

-- Supervisors and managers can view all employees
CREATE POLICY "Supervisors can view all employees"
ON employees FOR SELECT
USING (
  has_role('admin') OR 
  has_role('security_supervisor') OR 
  has_role('society_manager') OR
  has_role('company_hod')
);

-- Admins can fully manage employees
CREATE POLICY "Admins can manage employees"
ON employees FOR ALL
USING (has_role('admin'));;
