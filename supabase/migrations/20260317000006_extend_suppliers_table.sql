-- Extend suppliers table with missing columns from reference schema + app requirements

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(10),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Generate supplier codes for existing rows that don't have one
UPDATE suppliers
SET supplier_code = 'SUP-' || UPPER(SUBSTRING(id::text, 1, 8))
WHERE supplier_code IS NULL;

-- Add unique constraint on supplier_code (non-null only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_supplier_code
  ON suppliers(supplier_code)
  WHERE supplier_code IS NOT NULL;

-- Sync is_active → status for existing rows
UPDATE suppliers
SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END
WHERE status IS NULL OR status = '';
