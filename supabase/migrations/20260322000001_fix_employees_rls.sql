-- Fix employees table RLS: restrict to authorized roles only
-- Currently has USING(true) which exposes PII to all authenticated users

ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop the overly-permissive policy
DROP POLICY IF EXISTS "All users can view employees" ON employees;

-- New policy: internal staff roles only
CREATE POLICY "Internal staff can view employees"
ON employees FOR SELECT
USING (
  auth.jwt() ->> 'user_role' IN (
    'admin', 'super_admin', 'company_md', 'company_hod',
    'account', 'storekeeper', 'site_supervisor',
    'security_supervisor', 'society_manager'
  )
);

-- Employees can view their own record
CREATE POLICY "Employee can view own record"
ON employees FOR SELECT
USING (
  id IN (
    SELECT employee_id FROM users WHERE id = auth.uid()
  )
);

-- Admin/super_admin can write
CREATE POLICY "Admin can modify employees"
ON employees FOR ALL
USING (
  auth.jwt() ->> 'user_role' IN ('admin', 'super_admin')
);
