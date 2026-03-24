-- Fix payroll_cycles policies so they target the live schema.
-- Keep generate_payroll_cycle executable by authenticated users for now because
-- the current app still invokes the RPC from the client. Once payroll
-- generation moves behind a trusted server-side path, this grant can be
-- tightened safely without breaking the UI.

DROP POLICY IF EXISTS "Account and admin can view payroll_cycles" ON payroll_cycles;
DROP POLICY IF EXISTS "Admin can modify payroll_cycles" ON payroll_cycles;

CREATE POLICY "Account and admin can view payroll_cycles"
ON payroll_cycles FOR SELECT
TO authenticated
USING (
  get_my_app_role() IN ('admin', 'super_admin', 'account')
);

CREATE POLICY "Admin can modify payroll_cycles"
ON payroll_cycles FOR ALL
TO authenticated
USING (
  get_my_app_role() IN ('admin', 'super_admin')
)
WITH CHECK (
  get_my_app_role() IN ('admin', 'super_admin')
);

GRANT EXECUTE ON FUNCTION generate_payroll_cycle(UUID, UUID) TO authenticated;
