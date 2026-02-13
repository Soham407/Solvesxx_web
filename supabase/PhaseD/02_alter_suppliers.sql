-- ============================================================
-- Phase D: Supply Chain Core - Part 2: ALTER Suppliers Table
-- ============================================================
-- Description: Adds comprehensive supplier management columns
-- Dependencies: 01_enums_and_sequence.sql
-- ============================================================

-- Add new columns to suppliers table
ALTER TABLE suppliers
  -- Identification
  ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS supplier_type supplier_type,
  
  -- Extended Contact Info
  ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10),
  
  -- Address Fields (granular)
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(10),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India',
  
  -- Banking Details
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(11),
  
  -- Business Terms
  ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30, -- Days
  ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2) DEFAULT 0,
  
  -- Rating & Status
  ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status supplier_status DEFAULT 'pending_verification',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tier SMALLINT DEFAULT 3, -- 1=Platinum, 2=Gold, 3=Silver
  
  -- Performance Scores (Manual Entry)
  ADD COLUMN IF NOT EXISTS overall_score DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_score DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_score DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_score DECIMAL(5,2) DEFAULT 0,
  
  -- Audit Fields
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES employees(id);

-- Add constraints
ALTER TABLE suppliers
  ADD CONSTRAINT suppliers_rating_check CHECK (rating >= 0 AND rating <= 5),
  ADD CONSTRAINT suppliers_tier_check CHECK (tier BETWEEN 1 AND 3),
  ADD CONSTRAINT suppliers_scores_check CHECK (
    overall_score >= 0 AND overall_score <= 100 AND
    quality_score >= 0 AND quality_score <= 100 AND
    delivery_score >= 0 AND delivery_score <= 100 AND
    price_score >= 0 AND price_score <= 100 AND
    service_score >= 0 AND service_score <= 100
  );

-- Create trigger for auto-generating supplier code
DROP TRIGGER IF EXISTS trigger_generate_supplier_code ON suppliers;
CREATE TRIGGER trigger_generate_supplier_code
  BEFORE INSERT ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION generate_supplier_code();

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_suppliers_updated_at ON suppliers;
CREATE TRIGGER trigger_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_tier ON suppliers(tier);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_type ON suppliers(supplier_type);

-- Comments
COMMENT ON COLUMN suppliers.supplier_code IS 'Auto-generated unique code: SUP-YYYY-NNNN';
COMMENT ON COLUMN suppliers.supplier_type IS 'Business type: manufacturer, distributor, etc.';
COMMENT ON COLUMN suppliers.payment_terms IS 'Payment terms in days (default 30)';
COMMENT ON COLUMN suppliers.credit_limit IS 'Maximum credit allowed in INR';
COMMENT ON COLUMN suppliers.rating IS 'Overall rating 0-5 stars';
COMMENT ON COLUMN suppliers.tier IS 'Supplier tier: 1=Platinum, 2=Gold, 3=Silver';
COMMENT ON COLUMN suppliers.overall_score IS 'Aggregated performance score 0-100';
COMMENT ON COLUMN suppliers.quality_score IS 'Quality performance score 0-100';
COMMENT ON COLUMN suppliers.delivery_score IS 'Delivery performance score 0-100';
COMMENT ON COLUMN suppliers.price_score IS 'Price competitiveness score 0-100';
COMMENT ON COLUMN suppliers.service_score IS 'Customer service score 0-100';
