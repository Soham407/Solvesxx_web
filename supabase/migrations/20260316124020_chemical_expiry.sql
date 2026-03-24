ALTER TABLE pest_control_chemicals
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_pest_control_chemicals_expiry ON pest_control_chemicals(expiry_date);;
