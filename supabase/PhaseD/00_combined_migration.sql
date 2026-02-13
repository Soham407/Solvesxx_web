-- ============================================================
-- Phase D: Supply Chain Core - COMBINED MIGRATION
-- ============================================================
-- This file combines all Phase D migrations for easy application
-- Run this file in order on a Supabase project to set up Phase D
-- 
-- Files included:
--   01_enums_and_sequence.sql
--   02_alter_suppliers.sql
--   03_alter_supplier_products.sql
--   04_alter_rates_tables.sql
--   05_helper_functions.sql
--   06_rls_policies.sql
-- ============================================================

-- ============================================================
-- PART 1: ENUMs and Sequences
-- ============================================================

DO $$ BEGIN
  CREATE TYPE supplier_status AS ENUM ('active','inactive','blacklisted','pending_verification');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE supplier_type AS ENUM ('manufacturer','distributor','wholesaler','retailer','service_provider');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE SEQUENCE IF NOT EXISTS supplier_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_supplier_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.supplier_code IS NULL OR NEW.supplier_code = '' THEN
    NEW.supplier_code := 'SUP-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || LPAD(nextval('supplier_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;


-- ============================================================
-- PART 2: ALTER Suppliers Table
-- ============================================================

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS supplier_type supplier_type,
  ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(10),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(11),
  ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status supplier_status DEFAULT 'pending_verification',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tier SMALLINT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS overall_score DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_score DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_score DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_score DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES employees(id);

-- Note: Add these constraints only if they don't exist (wrap in DO block for safety)
DO $$ BEGIN
  ALTER TABLE suppliers ADD CONSTRAINT suppliers_rating_check CHECK (rating >= 0 AND rating <= 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE suppliers ADD CONSTRAINT suppliers_tier_check CHECK (tier BETWEEN 1 AND 3);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE suppliers ADD CONSTRAINT suppliers_scores_check CHECK (
    overall_score >= 0 AND overall_score <= 100 AND
    quality_score >= 0 AND quality_score <= 100 AND
    delivery_score >= 0 AND delivery_score <= 100 AND
    price_score >= 0 AND price_score <= 100 AND
    service_score >= 0 AND service_score <= 100
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trigger_generate_supplier_code ON suppliers;
CREATE TRIGGER trigger_generate_supplier_code
  BEFORE INSERT ON suppliers FOR EACH ROW EXECUTE FUNCTION generate_supplier_code();

DROP TRIGGER IF EXISTS trigger_suppliers_updated_at ON suppliers;
CREATE TRIGGER trigger_suppliers_updated_at
  BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_tier ON suppliers(tier);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_type ON suppliers(supplier_type);


-- ============================================================
-- PART 3: ALTER Supplier Products Table
-- ============================================================

ALTER TABLE supplier_products
  ADD COLUMN IF NOT EXISTS supplier_sku VARCHAR(50),
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS min_order_quantity DECIMAL(10,2) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_order_quantity DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS is_preferred BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS preference_rank INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pack_size VARCHAR(50),
  ADD COLUMN IF NOT EXISTS case_size INTEGER,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_products_supplier_product_unique') THEN
    ALTER TABLE supplier_products ADD CONSTRAINT supplier_products_supplier_product_unique UNIQUE (supplier_id, product_id);
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE supplier_products ADD CONSTRAINT supplier_products_lead_time_check CHECK (lead_time_days >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE supplier_products ADD CONSTRAINT supplier_products_min_qty_check CHECK (min_order_quantity > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE supplier_products ADD CONSTRAINT supplier_products_max_qty_check CHECK (max_order_quantity IS NULL OR max_order_quantity >= min_order_quantity);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trigger_supplier_products_updated_at ON supplier_products;
CREATE TRIGGER trigger_supplier_products_updated_at
  BEFORE UPDATE ON supplier_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_id ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_product_id ON supplier_products(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_is_preferred ON supplier_products(is_preferred);
CREATE INDEX IF NOT EXISTS idx_supplier_products_is_active ON supplier_products(is_active);


-- ============================================================
-- PART 4: ALTER Rates Tables
-- ============================================================

-- Supplier Rates
ALTER TABLE supplier_rates
  ADD COLUMN IF NOT EXISTS effective_to DATE,
  ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 18,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS min_qty_for_price DECIMAL(10,2) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);

DO $$ BEGIN
  ALTER TABLE supplier_rates ADD CONSTRAINT supplier_rates_date_check CHECK (effective_to IS NULL OR effective_to >= effective_from);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE supplier_rates ADD CONSTRAINT supplier_rates_discount_check CHECK (discount_percentage >= 0 AND discount_percentage <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE supplier_rates ADD CONSTRAINT supplier_rates_gst_check CHECK (gst_percentage >= 0 AND gst_percentage <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trigger_supplier_rates_updated_at ON supplier_rates;
CREATE TRIGGER trigger_supplier_rates_updated_at
  BEFORE UPDATE ON supplier_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_supplier_rates_effective_dates ON supplier_rates(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_supplier_rates_is_active ON supplier_rates(is_active);

-- Sale Product Rates
ALTER TABLE sale_product_rates
  ADD COLUMN IF NOT EXISTS society_id UUID REFERENCES societies(id),
  ADD COLUMN IF NOT EXISTS effective_to DATE,
  ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 18,
  ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS base_cost DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);

DO $$ BEGIN
  ALTER TABLE sale_product_rates ADD CONSTRAINT sale_product_rates_date_check CHECK (effective_to IS NULL OR effective_to >= effective_from);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE sale_product_rates ADD CONSTRAINT sale_product_rates_gst_check CHECK (gst_percentage >= 0 AND gst_percentage <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE sale_product_rates ADD CONSTRAINT sale_product_rates_margin_check CHECK (margin_percentage IS NULL OR margin_percentage >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trigger_sale_product_rates_updated_at ON sale_product_rates;
CREATE TRIGGER trigger_sale_product_rates_updated_at
  BEFORE UPDATE ON sale_product_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_sale_product_rates_product_id ON sale_product_rates(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_product_rates_society_id ON sale_product_rates(society_id);
CREATE INDEX IF NOT EXISTS idx_sale_product_rates_effective_dates ON sale_product_rates(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_sale_product_rates_is_active ON sale_product_rates(is_active);


-- ============================================================
-- PART 5: Helper Functions
-- ============================================================

CREATE OR REPLACE FUNCTION get_current_supplier_rate(
  p_supplier_id UUID, p_product_id UUID, p_as_of DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  rate_id UUID, rate DECIMAL, discount_percentage DECIMAL, gst_percentage DECIMAL,
  effective_from DATE, effective_to DATE, min_qty_for_price DECIMAL
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sr.id, sr.rate, COALESCE(sr.discount_percentage, 0), COALESCE(sr.gst_percentage, 18),
    sr.effective_from, sr.effective_to, COALESCE(sr.min_qty_for_price, 1)
  FROM supplier_rates sr JOIN supplier_products sp ON sr.supplier_product_id = sp.id
  WHERE sp.supplier_id = p_supplier_id AND sp.product_id = p_product_id
    AND sr.is_active = true AND sr.effective_from <= p_as_of
    AND (sr.effective_to IS NULL OR sr.effective_to >= p_as_of)
  ORDER BY sr.effective_from DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_preferred_supplier_for_product(p_product_id UUID, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  supplier_id UUID, supplier_name VARCHAR, supplier_code VARCHAR,
  current_rate DECIMAL, discount_percentage DECIMAL, gst_percentage DECIMAL,
  lead_time_days INTEGER, min_order_quantity DECIMAL
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.supplier_name, s.supplier_code,
    (SELECT rate FROM get_current_supplier_rate(s.id, p_product_id, p_as_of)),
    (SELECT discount_percentage FROM get_current_supplier_rate(s.id, p_product_id, p_as_of)),
    (SELECT gst_percentage FROM get_current_supplier_rate(s.id, p_product_id, p_as_of)),
    sp.lead_time_days, sp.min_order_quantity
  FROM suppliers s JOIN supplier_products sp ON s.id = sp.supplier_id
  WHERE sp.product_id = p_product_id AND sp.is_active = true AND sp.is_preferred = true
    AND (s.status = 'active' OR s.is_active = true)
  ORDER BY sp.preference_rank ASC, s.overall_score DESC NULLS LAST LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_suppliers_for_product(p_product_id UUID, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  supplier_id UUID, supplier_name VARCHAR, supplier_code VARCHAR, supplier_type supplier_type,
  is_preferred BOOLEAN, preference_rank INTEGER, current_rate DECIMAL,
  discount_percentage DECIMAL, gst_percentage DECIMAL, lead_time_days INTEGER,
  min_order_quantity DECIMAL, max_order_quantity DECIMAL, overall_score DECIMAL, tier SMALLINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.supplier_name, s.supplier_code, s.supplier_type, sp.is_preferred,
    COALESCE(sp.preference_rank, 999),
    (SELECT rate FROM get_current_supplier_rate(s.id, p_product_id, p_as_of)),
    (SELECT discount_percentage FROM get_current_supplier_rate(s.id, p_product_id, p_as_of)),
    (SELECT gst_percentage FROM get_current_supplier_rate(s.id, p_product_id, p_as_of)),
    COALESCE(sp.lead_time_days, 7), COALESCE(sp.min_order_quantity, 1), sp.max_order_quantity,
    COALESCE(s.overall_score, 0), COALESCE(s.tier, 3)
  FROM suppliers s JOIN supplier_products sp ON s.id = sp.supplier_id
  WHERE sp.product_id = p_product_id AND sp.is_active = true AND (s.status = 'active' OR s.is_active = true)
  ORDER BY sp.is_preferred DESC, sp.preference_rank ASC, s.overall_score DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION get_current_sale_rate(p_product_id UUID, p_society_id UUID DEFAULT NULL, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  rate_id UUID, rate DECIMAL, gst_percentage DECIMAL, margin_percentage DECIMAL,
  base_cost DECIMAL, is_society_specific BOOLEAN, effective_from DATE, effective_to DATE
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result RECORD;
BEGIN
  IF p_society_id IS NOT NULL THEN
    SELECT spr.id, spr.rate, COALESCE(spr.gst_percentage, 18), spr.margin_percentage,
      spr.base_cost, true, spr.effective_from, spr.effective_to INTO v_result
    FROM sale_product_rates spr
    WHERE spr.product_id = p_product_id AND spr.society_id = p_society_id AND spr.is_active = true
      AND spr.effective_from <= p_as_of AND (spr.effective_to IS NULL OR spr.effective_to >= p_as_of)
    ORDER BY spr.effective_from DESC LIMIT 1;
    IF FOUND THEN
      RETURN QUERY SELECT v_result.id, v_result.rate, v_result.gst_percentage,
        v_result.margin_percentage, v_result.base_cost, v_result.bool, v_result.effective_from, v_result.effective_to;
      RETURN;
    END IF;
  END IF;
  RETURN QUERY SELECT spr.id, spr.rate, COALESCE(spr.gst_percentage, 18), spr.margin_percentage,
    spr.base_cost, false, spr.effective_from, spr.effective_to
  FROM sale_product_rates spr
  WHERE spr.product_id = p_product_id AND spr.society_id IS NULL AND spr.is_active = true
    AND spr.effective_from <= p_as_of AND (spr.effective_to IS NULL OR spr.effective_to >= p_as_of)
  ORDER BY spr.effective_from DESC LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_net_rate(
  p_base_rate DECIMAL, p_discount_percentage DECIMAL DEFAULT 0,
  p_gst_percentage DECIMAL DEFAULT 18, p_include_gst BOOLEAN DEFAULT true
)
RETURNS DECIMAL LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_discounted_rate DECIMAL; v_net_rate DECIMAL;
BEGIN
  v_discounted_rate := p_base_rate * (1 - COALESCE(p_discount_percentage, 0) / 100);
  IF p_include_gst THEN v_net_rate := v_discounted_rate * (1 + COALESCE(p_gst_percentage, 18) / 100);
  ELSE v_net_rate := v_discounted_rate;
  END IF;
  RETURN ROUND(v_net_rate, 2);
END;
$$;


-- ============================================================
-- PART 6: RLS Policies
-- ============================================================

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_product_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View Suppliers" ON suppliers;
DROP POLICY IF EXISTS "Manage Suppliers" ON suppliers;
CREATE POLICY "View Suppliers" ON suppliers FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Manage Suppliers" ON suppliers FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]));

DROP POLICY IF EXISTS "View Supplier Products" ON supplier_products;
DROP POLICY IF EXISTS "Manage Supplier Products" ON supplier_products;
CREATE POLICY "View Supplier Products" ON supplier_products FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Manage Supplier Products" ON supplier_products FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]));

DROP POLICY IF EXISTS "View Supplier Rates" ON supplier_rates;
DROP POLICY IF EXISTS "Manage Supplier Rates" ON supplier_rates;
CREATE POLICY "View Supplier Rates" ON supplier_rates FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Manage Supplier Rates" ON supplier_rates FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]));

DROP POLICY IF EXISTS "View Sale Product Rates" ON sale_product_rates;
DROP POLICY IF EXISTS "Manage Sale Product Rates" ON sale_product_rates;
CREATE POLICY "View Sale Product Rates" ON sale_product_rates FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Manage Sale Product Rates" ON sale_product_rates FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]));

GRANT SELECT ON suppliers TO authenticated;
GRANT SELECT ON supplier_products TO authenticated;
GRANT SELECT ON supplier_rates TO authenticated;
GRANT SELECT ON sale_product_rates TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_supplier_rate TO authenticated;
GRANT EXECUTE ON FUNCTION get_preferred_supplier_for_product TO authenticated;
GRANT EXECUTE ON FUNCTION get_suppliers_for_product TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_sale_rate TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_net_rate TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
SELECT 'Phase D Supply Chain Core migration completed successfully!' as result;
