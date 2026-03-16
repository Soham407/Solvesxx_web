-- Chemical Expiry Tracking
-- Adds expiry_date and batch_number to pest_control_chemicals for safety compliance.

ALTER TABLE pest_control_chemicals
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50);

-- Index for fast expiry queries
CREATE INDEX IF NOT EXISTS idx_pest_control_chemicals_expiry ON pest_control_chemicals(expiry_date);
