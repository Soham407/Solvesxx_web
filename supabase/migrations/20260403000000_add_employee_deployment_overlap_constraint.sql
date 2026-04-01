-- Add employee deployment overlap constraint
-- Task ID: SINGLE-DEPLOY-001

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Add missing columns to personnel_dispatches
ALTER TABLE personnel_dispatches 
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- 2. Update existing rows if any to have a valid start_date from dispatch_date
UPDATE personnel_dispatches SET start_date = dispatch_date WHERE start_date IS NULL;

-- 3. Add the EXCLUSION constraint to prevent overlapping active deployments for the same employee
-- Statuses: dispatched, confirmed, active are considered "active" deployments.
-- withdrawn, cancelled, completed are terminal.
ALTER TABLE personnel_dispatches
  ADD CONSTRAINT personnel_dispatches_overlap_excl
  EXCLUDE USING gist (
    employee_id WITH =,
    daterange(start_date, COALESCE(end_date, 'infinity'::date), '[)') WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'completed', 'withdrawn'));

-- 4. Add index for performance on the new column
CREATE INDEX IF NOT EXISTS idx_personnel_dispatches_employee_id ON personnel_dispatches(employee_id);
