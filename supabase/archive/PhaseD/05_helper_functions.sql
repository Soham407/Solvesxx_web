-- ============================================================
-- Phase D: Supply Chain Core - Part 5: Helper Functions
-- ============================================================
-- Description: Creates helper functions for rate lookups
-- Dependencies: 04_alter_rates_tables.sql
-- ============================================================

-- ============================================================
-- Function: Get Current Supplier Rate
-- Returns the active rate for a supplier-product combination as of a given date
-- ============================================================
CREATE OR REPLACE FUNCTION get_current_supplier_rate(
  p_supplier_id UUID,
  p_product_id UUID,
  p_as_of DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  rate_id UUID,
  rate DECIMAL,
  discount_percentage DECIMAL,
  gst_percentage DECIMAL,
  effective_from DATE,
  effective_to DATE,
  min_qty_for_price DECIMAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sr.id as rate_id,
    sr.rate,
    COALESCE(sr.discount_percentage, 0) as discount_percentage,
    COALESCE(sr.gst_percentage, 18) as gst_percentage,
    sr.effective_from,
    sr.effective_to,
    COALESCE(sr.min_qty_for_price, 1) as min_qty_for_price
  FROM supplier_rates sr
  JOIN supplier_products sp ON sr.supplier_product_id = sp.id
  WHERE sp.supplier_id = p_supplier_id
    AND sp.product_id = p_product_id
    AND sr.is_active = true
    AND sr.effective_from <= p_as_of
    AND (sr.effective_to IS NULL OR sr.effective_to >= p_as_of)
  ORDER BY sr.effective_from DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_current_supplier_rate IS 'Returns the currently active rate for a supplier-product combination';


-- ============================================================
-- Function: Get Preferred Supplier for Product
-- Returns the preferred supplier with their current rate
-- ============================================================
CREATE OR REPLACE FUNCTION get_preferred_supplier_for_product(
  p_product_id UUID,
  p_as_of DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  supplier_id UUID,
  supplier_name VARCHAR,
  supplier_code VARCHAR,
  current_rate DECIMAL,
  discount_percentage DECIMAL,
  gst_percentage DECIMAL,
  lead_time_days INTEGER,
  min_order_quantity DECIMAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id as supplier_id,
    s.supplier_name,
    s.supplier_code,
    (SELECT rate FROM get_current_supplier_rate(s.id, p_product_id, p_as_of)) as current_rate,
    (SELECT discount_percentage FROM get_current_supplier_rate(s.id, p_product_id, p_as_of)) as discount_percentage,
    (SELECT gst_percentage FROM get_current_supplier_rate(s.id, p_product_id, p_as_of)) as gst_percentage,
    sp.lead_time_days,
    sp.min_order_quantity
  FROM suppliers s
  JOIN supplier_products sp ON s.id = sp.supplier_id
  WHERE sp.product_id = p_product_id
    AND sp.is_active = true
    AND sp.is_preferred = true
    AND (s.status = 'active' OR s.is_active = true)
  ORDER BY sp.preference_rank ASC, s.overall_score DESC NULLS LAST
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_preferred_supplier_for_product IS 'Returns the preferred supplier for a product with their current rate';


-- ============================================================
-- Function: Get All Suppliers for Product
-- Returns all active suppliers for a product with their rates
-- ============================================================
CREATE OR REPLACE FUNCTION get_suppliers_for_product(
  p_product_id UUID,
  p_as_of DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  supplier_id UUID,
  supplier_name VARCHAR,
  supplier_code VARCHAR,
  supplier_type supplier_type,
  is_preferred BOOLEAN,
  preference_rank INTEGER,
  current_rate DECIMAL,
  discount_percentage DECIMAL,
  gst_percentage DECIMAL,
  lead_time_days INTEGER,
  min_order_quantity DECIMAL,
  max_order_quantity DECIMAL,
  overall_score DECIMAL,
  tier SMALLINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id as supplier_id,
    s.supplier_name,
    s.supplier_code,
    s.supplier_type,
    sp.is_preferred,
    COALESCE(sp.preference_rank, 999) as preference_rank,
    (SELECT rate FROM get_current_supplier_rate(s.id, p_product_id, p_as_of)) as current_rate,
    (SELECT discount_percentage FROM get_current_supplier_rate(s.id, p_product_id, p_as_of)) as discount_percentage,
    (SELECT gst_percentage FROM get_current_supplier_rate(s.id, p_product_id, p_as_of)) as gst_percentage,
    COALESCE(sp.lead_time_days, 7) as lead_time_days,
    COALESCE(sp.min_order_quantity, 1) as min_order_quantity,
    sp.max_order_quantity,
    COALESCE(s.overall_score, 0) as overall_score,
    COALESCE(s.tier, 3) as tier
  FROM suppliers s
  JOIN supplier_products sp ON s.id = sp.supplier_id
  WHERE sp.product_id = p_product_id
    AND sp.is_active = true
    AND (s.status = 'active' OR s.is_active = true)
  ORDER BY sp.is_preferred DESC, sp.preference_rank ASC, s.overall_score DESC NULLS LAST;
$$;

COMMENT ON FUNCTION get_suppliers_for_product IS 'Returns all active suppliers for a product with their current rates, ordered by preference';


-- ============================================================
-- Function: Get Current Sale Rate
-- Returns the sale rate for a product, with society-specific fallback to global
-- ============================================================
CREATE OR REPLACE FUNCTION get_current_sale_rate(
  p_product_id UUID,
  p_society_id UUID DEFAULT NULL,
  p_as_of DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  rate_id UUID,
  rate DECIMAL,
  gst_percentage DECIMAL,
  margin_percentage DECIMAL,
  base_cost DECIMAL,
  is_society_specific BOOLEAN,
  effective_from DATE,
  effective_to DATE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- First try society-specific rate if society_id is provided
  IF p_society_id IS NOT NULL THEN
    SELECT 
      spr.id as rate_id,
      spr.rate,
      COALESCE(spr.gst_percentage, 18) as gst_percentage,
      spr.margin_percentage,
      spr.base_cost,
      true as is_society_specific,
      spr.effective_from,
      spr.effective_to
    INTO v_result
    FROM sale_product_rates spr
    WHERE spr.product_id = p_product_id
      AND spr.society_id = p_society_id
      AND spr.is_active = true
      AND spr.effective_from <= p_as_of
      AND (spr.effective_to IS NULL OR spr.effective_to >= p_as_of)
    ORDER BY spr.effective_from DESC
    LIMIT 1;
    
    IF FOUND THEN
      RETURN QUERY SELECT 
        v_result.rate_id,
        v_result.rate,
        v_result.gst_percentage,
        v_result.margin_percentage,
        v_result.base_cost,
        v_result.is_society_specific,
        v_result.effective_from,
        v_result.effective_to;
      RETURN;
    END IF;
  END IF;
  
  -- Fallback to global rate (society_id IS NULL)
  RETURN QUERY
  SELECT 
    spr.id as rate_id,
    spr.rate,
    COALESCE(spr.gst_percentage, 18) as gst_percentage,
    spr.margin_percentage,
    spr.base_cost,
    false as is_society_specific,
    spr.effective_from,
    spr.effective_to
  FROM sale_product_rates spr
  WHERE spr.product_id = p_product_id
    AND spr.society_id IS NULL
    AND spr.is_active = true
    AND spr.effective_from <= p_as_of
    AND (spr.effective_to IS NULL OR spr.effective_to >= p_as_of)
  ORDER BY spr.effective_from DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_current_sale_rate IS 'Returns the sale rate for a product, first checking society-specific rate then falling back to global rate';


-- ============================================================
-- Function: Calculate Net Rate (with discount and GST)
-- Utility function for calculating final rates
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_net_rate(
  p_base_rate DECIMAL,
  p_discount_percentage DECIMAL DEFAULT 0,
  p_gst_percentage DECIMAL DEFAULT 18,
  p_include_gst BOOLEAN DEFAULT true
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_discounted_rate DECIMAL;
  v_net_rate DECIMAL;
BEGIN
  -- Apply discount
  v_discounted_rate := p_base_rate * (1 - COALESCE(p_discount_percentage, 0) / 100);
  
  -- Apply GST if requested
  IF p_include_gst THEN
    v_net_rate := v_discounted_rate * (1 + COALESCE(p_gst_percentage, 18) / 100);
  ELSE
    v_net_rate := v_discounted_rate;
  END IF;
  
  RETURN ROUND(v_net_rate, 2);
END;
$$;

COMMENT ON FUNCTION calculate_net_rate IS 'Calculates net rate after applying discount and optionally GST';
