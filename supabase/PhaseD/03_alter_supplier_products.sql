-- ============================================================
-- Phase D: Supply Chain Core - Part 3: ALTER Supplier Products Table
-- ============================================================
-- Description: Adds supplier-product mapping enhancements
-- Dependencies: 02_alter_suppliers.sql
-- ============================================================

-- Add new columns to supplier_products table
ALTER TABLE supplier_products
  -- Supplier-specific product info
  ADD COLUMN IF NOT EXISTS supplier_sku VARCHAR(50),
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS min_order_quantity DECIMAL(10,2) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_order_quantity DECIMAL(10,2),
  
  -- Preference settings
  ADD COLUMN IF NOT EXISTS is_preferred BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS preference_rank INTEGER DEFAULT 0,
  
  -- Packaging info
  ADD COLUMN IF NOT EXISTS pack_size VARCHAR(50),
  ADD COLUMN IF NOT EXISTS case_size INTEGER,
  
  -- Status
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  
  -- Audit fields
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);

-- Add UNIQUE constraint for supplier-product combination
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'supplier_products_supplier_product_unique'
  ) THEN
    ALTER TABLE supplier_products
      ADD CONSTRAINT supplier_products_supplier_product_unique 
      UNIQUE (supplier_id, product_id);
  END IF;
END $$;

-- Add constraints
ALTER TABLE supplier_products
  ADD CONSTRAINT supplier_products_lead_time_check CHECK (lead_time_days >= 0),
  ADD CONSTRAINT supplier_products_min_qty_check CHECK (min_order_quantity > 0),
  ADD CONSTRAINT supplier_products_max_qty_check CHECK (max_order_quantity IS NULL OR max_order_quantity >= min_order_quantity);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_supplier_products_updated_at ON supplier_products;
CREATE TRIGGER trigger_supplier_products_updated_at
  BEFORE UPDATE ON supplier_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_id ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_product_id ON supplier_products(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_is_preferred ON supplier_products(is_preferred);
CREATE INDEX IF NOT EXISTS idx_supplier_products_is_active ON supplier_products(is_active);

-- Comments
COMMENT ON COLUMN supplier_products.supplier_sku IS 'Supplier-specific SKU/product code';
COMMENT ON COLUMN supplier_products.lead_time_days IS 'Expected delivery time in days';
COMMENT ON COLUMN supplier_products.min_order_quantity IS 'Minimum order quantity required';
COMMENT ON COLUMN supplier_products.max_order_quantity IS 'Maximum order quantity (optional)';
COMMENT ON COLUMN supplier_products.is_preferred IS 'Whether this is the preferred supplier for this product';
COMMENT ON COLUMN supplier_products.preference_rank IS 'Ranking among multiple preferred suppliers (lower = higher priority)';
COMMENT ON COLUMN supplier_products.pack_size IS 'Package size description (e.g., "10 units/pack")';
COMMENT ON COLUMN supplier_products.case_size IS 'Number of units per case';
