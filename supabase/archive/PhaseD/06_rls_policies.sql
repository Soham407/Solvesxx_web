-- ============================================================
-- Phase D: Supply Chain Core - Part 6: RLS Policies
-- ============================================================
-- Description: Row Level Security policies for Phase D tables
-- Dependencies: 05_helper_functions.sql
-- ============================================================

-- ============================================================
-- Enable RLS on all Phase D tables
-- ============================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_product_rates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SUPPLIERS POLICIES
-- ============================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "View Suppliers" ON suppliers;
DROP POLICY IF EXISTS "Manage Suppliers" ON suppliers;

-- View: All authenticated users can view suppliers
CREATE POLICY "View Suppliers" ON suppliers
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');

-- Manage: Only admin, company_hod, account can insert/update/delete
CREATE POLICY "Manage Suppliers" ON suppliers
  FOR ALL
  TO authenticated
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]));


-- ============================================================
-- SUPPLIER_PRODUCTS POLICIES
-- ============================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "View Supplier Products" ON supplier_products;
DROP POLICY IF EXISTS "Manage Supplier Products" ON supplier_products;

-- View: All authenticated users can view supplier-product mappings
CREATE POLICY "View Supplier Products" ON supplier_products
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');

-- Manage: Only admin, company_hod, account can manage mappings
CREATE POLICY "Manage Supplier Products" ON supplier_products
  FOR ALL
  TO authenticated
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]));


-- ============================================================
-- SUPPLIER_RATES POLICIES
-- ============================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "View Supplier Rates" ON supplier_rates;
DROP POLICY IF EXISTS "Manage Supplier Rates" ON supplier_rates;

-- View: All authenticated users can view supplier rates
CREATE POLICY "View Supplier Rates" ON supplier_rates
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');

-- Manage: Only admin, company_hod, account can manage rates
CREATE POLICY "Manage Supplier Rates" ON supplier_rates
  FOR ALL
  TO authenticated
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]));


-- ============================================================
-- SALE_PRODUCT_RATES POLICIES
-- ============================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "View Sale Product Rates" ON sale_product_rates;
DROP POLICY IF EXISTS "Manage Sale Product Rates" ON sale_product_rates;

-- View: All authenticated users can view sale rates
CREATE POLICY "View Sale Product Rates" ON sale_product_rates
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');

-- Manage: Only admin, company_hod, account can manage sale rates
CREATE POLICY "Manage Sale Product Rates" ON sale_product_rates
  FOR ALL
  TO authenticated
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'company_hod'::user_role, 'account'::user_role]));


-- ============================================================
-- Grant permissions to authenticated role
-- ============================================================
GRANT SELECT ON suppliers TO authenticated;
GRANT SELECT ON supplier_products TO authenticated;
GRANT SELECT ON supplier_rates TO authenticated;
GRANT SELECT ON sale_product_rates TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION get_current_supplier_rate TO authenticated;
GRANT EXECUTE ON FUNCTION get_preferred_supplier_for_product TO authenticated;
GRANT EXECUTE ON FUNCTION get_suppliers_for_product TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_sale_rate TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_net_rate TO authenticated;
