-- ============================================
-- Products & Inventory Schema Patch
-- Aligns database with useProducts.ts hook requirements
-- Created: 2026-02-09
-- ============================================

-- ============================================
-- 1. ADD MISSING COLUMNS TO PRODUCT_CATEGORIES
-- ============================================

-- Add category_code if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_categories' AND column_name = 'category_code') THEN
    ALTER TABLE product_categories ADD COLUMN category_code VARCHAR(20) UNIQUE;
  END IF;
END $$;

-- Add parent_category_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_categories' AND column_name = 'parent_category_id') THEN
    ALTER TABLE product_categories ADD COLUMN parent_category_id UUID REFERENCES product_categories(id);
  END IF;
END $$;

-- Add updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_categories' AND column_name = 'updated_at') THEN
    ALTER TABLE product_categories ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Add created_by and updated_by if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_categories' AND column_name = 'created_by') THEN
    ALTER TABLE product_categories ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_categories' AND column_name = 'updated_by') THEN
    ALTER TABLE product_categories ADD COLUMN updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- ============================================
-- 2. ADD MISSING COLUMNS TO PRODUCT_SUBCATEGORIES
-- ============================================

-- Add subcategory_code if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_subcategories' AND column_name = 'subcategory_code') THEN
    ALTER TABLE product_subcategories ADD COLUMN subcategory_code VARCHAR(20) UNIQUE;
  END IF;
END $$;

-- Add updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_subcategories' AND column_name = 'updated_at') THEN
    ALTER TABLE product_subcategories ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Add created_by and updated_by if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_subcategories' AND column_name = 'created_by') THEN
    ALTER TABLE product_subcategories ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_subcategories' AND column_name = 'updated_by') THEN
    ALTER TABLE product_subcategories ADD COLUMN updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- ============================================
-- 3. ADD MISSING COLUMNS TO PRODUCTS
-- ============================================

-- Add category_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category_id') THEN
    ALTER TABLE products ADD COLUMN category_id UUID REFERENCES product_categories(id);
  END IF;
END $$;

-- Add unit_of_measurement if it doesn't exist (hook expects this, not just 'unit')
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'unit_of_measurement') THEN
    -- If 'unit' exists, rename it; otherwise add new column
    IF EXISTS (SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'unit') THEN
      ALTER TABLE products RENAME COLUMN unit TO unit_of_measurement;
    ELSE
      ALTER TABLE products ADD COLUMN unit_of_measurement VARCHAR(20);
    END IF;
  END IF;
END $$;

-- Add base_rate if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'base_rate') THEN
    ALTER TABLE products ADD COLUMN base_rate DECIMAL(10, 2);
  END IF;
END $$;

-- Add min_stock_level if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'min_stock_level') THEN
    ALTER TABLE products ADD COLUMN min_stock_level INTEGER DEFAULT 10;
  END IF;
END $$;

-- Add current_stock if it doesn't exist (for simple stock tracking)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'current_stock') THEN
    ALTER TABLE products ADD COLUMN current_stock INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add hsn_code if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'hsn_code') THEN
    ALTER TABLE products ADD COLUMN hsn_code VARCHAR(20);
  END IF;
END $$;

-- Add specifications JSONB if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'specifications') THEN
    ALTER TABLE products ADD COLUMN specifications JSONB;
  END IF;
END $$;

-- Add status if it doesn't exist (hook uses 'active'/'inactive')
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'status') THEN
    ALTER TABLE products ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
END $$;

-- Add updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'updated_at') THEN
    ALTER TABLE products ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Add created_by and updated_by if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'created_by') THEN
    ALTER TABLE products ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'updated_by') THEN
    ALTER TABLE products ADD COLUMN updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- ============================================
-- 4. CREATE/UPDATE INVENTORY TABLE IF NEEDED
-- ============================================

-- Create inventory table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    product_id UUID REFERENCES products(id) NOT NULL,
    location_id UUID REFERENCES company_locations(id),
    quantity_on_hand DECIMAL(10, 2) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(10, 2) DEFAULT 0,
    reorder_level DECIMAL(10, 2),
    max_stock_level DECIMAL(10, 2),
    last_stock_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, location_id)
);

-- ============================================
-- 5. CREATE STOCK_TRANSACTIONS TABLE IF NEEDED
-- ============================================

-- Create stock_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS stock_transactions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    location_id UUID REFERENCES company_locations(id),
    transaction_type VARCHAR(20) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measurement VARCHAR(20) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    transaction_date DATE NOT NULL,
    batch_number VARCHAR(50),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. CREATE INDEXES
-- ============================================

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_current_stock ON products(current_stock);

-- Product subcategories index
CREATE INDEX IF NOT EXISTS idx_product_subcategories_category_id ON product_subcategories(category_id);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location_id ON inventory(location_id);

-- Stock transactions indexes
CREATE INDEX IF NOT EXISTS idx_stock_transactions_product_id ON stock_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_transaction_date ON stock_transactions(transaction_date);

-- ============================================
-- 7. UPDATE TRIGGER FOR updated_at
-- ============================================

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to products
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to product_categories
DROP TRIGGER IF EXISTS update_product_categories_updated_at ON product_categories;
CREATE TRIGGER update_product_categories_updated_at 
    BEFORE UPDATE ON product_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to product_subcategories
DROP TRIGGER IF EXISTS update_product_subcategories_updated_at ON product_subcategories;
CREATE TRIGGER update_product_subcategories_updated_at 
    BEFORE UPDATE ON product_subcategories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to inventory
DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at 
    BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. SEED INITIAL DATA (IF EMPTY)
-- ============================================

-- Insert sample product categories if empty
INSERT INTO product_categories (id, category_code, category_name, description, is_active)
SELECT 
    extensions.uuid_generate_v4(),
    'CAT-001',
    'Cleaning Supplies',
    'All cleaning and housekeeping supplies',
    true
WHERE NOT EXISTS (SELECT 1 FROM product_categories LIMIT 1);

INSERT INTO product_categories (id, category_code, category_name, description, is_active)
SELECT 
    extensions.uuid_generate_v4(),
    'CAT-002',
    'Office Supplies',
    'Stationery and office equipment',
    true
WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE category_code = 'CAT-002');

INSERT INTO product_categories (id, category_code, category_name, description, is_active)
SELECT 
    extensions.uuid_generate_v4(),
    'CAT-003',
    'Maintenance',
    'Maintenance and repair supplies',
    true
WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE category_code = 'CAT-003');

-- ============================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN products.current_stock IS 'Simple stock count for quick reference. For detailed tracking, use inventory table.';
COMMENT ON COLUMN products.min_stock_level IS 'Minimum stock level before reorder alert is triggered.';
COMMENT ON COLUMN products.status IS 'Product status: active, inactive, discontinued';
COMMENT ON TABLE inventory IS 'Detailed inventory tracking by product and location';
COMMENT ON TABLE stock_transactions IS 'All inventory movements for audit trail';;
