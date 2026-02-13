-- ============================================================
-- Phase D: Supply Chain Core - Part 4: ALTER Rates Tables
-- ============================================================
-- Description: Enhances supplier_rates and sale_product_rates tables
-- Dependencies: 03_alter_supplier_products.sql
-- ============================================================

-- ============================================================
-- SUPPLIER RATES TABLE ENHANCEMENTS
-- ============================================================

ALTER TABLE supplier_rates
  -- Date range support
  ADD COLUMN IF NOT EXISTS effective_to DATE,
  
  -- Pricing details
  ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 18,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS min_qty_for_price DECIMAL(10,2) DEFAULT 1,
  
  -- Notes
  ADD COLUMN IF NOT EXISTS notes TEXT,
  
  -- Audit fields
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);

-- Add constraints
ALTER TABLE supplier_rates
  ADD CONSTRAINT supplier_rates_date_check CHECK (effective_to IS NULL OR effective_to >= effective_from),
  ADD CONSTRAINT supplier_rates_discount_check CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  ADD CONSTRAINT supplier_rates_gst_check CHECK (gst_percentage >= 0 AND gst_percentage <= 100);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_supplier_rates_updated_at ON supplier_rates;
CREATE TRIGGER trigger_supplier_rates_updated_at
  BEFORE UPDATE ON supplier_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_supplier_rates_effective_dates ON supplier_rates(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_supplier_rates_is_active ON supplier_rates(is_active);

-- ============================================================
-- SALE PRODUCT RATES TABLE ENHANCEMENTS
-- ============================================================

ALTER TABLE sale_product_rates
  -- Society-specific pricing (NULL = global rate)
  ADD COLUMN IF NOT EXISTS society_id UUID REFERENCES societies(id),
  
  -- Date range support
  ADD COLUMN IF NOT EXISTS effective_to DATE,
  
  -- Pricing details
  ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 18,
  ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS base_cost DECIMAL(15,2), -- Reference supplier cost
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR',
  
  -- Notes
  ADD COLUMN IF NOT EXISTS notes TEXT,
  
  -- Audit fields
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);

-- Add constraints
ALTER TABLE sale_product_rates
  ADD CONSTRAINT sale_product_rates_date_check CHECK (effective_to IS NULL OR effective_to >= effective_from),
  ADD CONSTRAINT sale_product_rates_gst_check CHECK (gst_percentage >= 0 AND gst_percentage <= 100),
  ADD CONSTRAINT sale_product_rates_margin_check CHECK (margin_percentage IS NULL OR margin_percentage >= 0);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_sale_product_rates_updated_at ON sale_product_rates;
CREATE TRIGGER trigger_sale_product_rates_updated_at
  BEFORE UPDATE ON sale_product_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sale_product_rates_product_id ON sale_product_rates(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_product_rates_society_id ON sale_product_rates(society_id);
CREATE INDEX IF NOT EXISTS idx_sale_product_rates_effective_dates ON sale_product_rates(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_sale_product_rates_is_active ON sale_product_rates(is_active);

-- Comments for supplier_rates
COMMENT ON COLUMN supplier_rates.effective_to IS 'End date for this rate (NULL = no end date)';
COMMENT ON COLUMN supplier_rates.discount_percentage IS 'Discount percentage off base rate';
COMMENT ON COLUMN supplier_rates.gst_percentage IS 'GST rate applicable (default 18%)';
COMMENT ON COLUMN supplier_rates.min_qty_for_price IS 'Minimum quantity to qualify for this price';

-- Comments for sale_product_rates
COMMENT ON COLUMN sale_product_rates.society_id IS 'Society-specific rate (NULL = global rate)';
COMMENT ON COLUMN sale_product_rates.effective_to IS 'End date for this rate (NULL = no end date)';
COMMENT ON COLUMN sale_product_rates.margin_percentage IS 'Profit margin percentage';
COMMENT ON COLUMN sale_product_rates.base_cost IS 'Reference cost from supplier rate';
