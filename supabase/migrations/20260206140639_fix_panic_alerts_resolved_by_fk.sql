-- ============================================
-- Fix #3: Fix panic_alerts.resolved_by FK
-- Change from auth.users to employees for consistency
-- ============================================

-- Drop the existing incorrect FK constraint
ALTER TABLE panic_alerts 
DROP CONSTRAINT IF EXISTS panic_alerts_resolved_by_fkey;

-- Add the correct FK constraint to employees
ALTER TABLE panic_alerts 
ADD CONSTRAINT panic_alerts_resolved_by_fkey 
FOREIGN KEY (resolved_by) REFERENCES employees(id);

-- Comment for documentation
COMMENT ON COLUMN panic_alerts.resolved_by IS 'Employee ID who resolved this alert';;
