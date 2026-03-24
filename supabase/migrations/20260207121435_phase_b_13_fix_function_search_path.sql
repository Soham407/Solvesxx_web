-- ============================================
-- PHASE B MIGRATION 13: FIX FUNCTION SEARCH PATH
-- ============================================

-- Update functions with explicit search_path

CREATE OR REPLACE FUNCTION update_phase_b_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION generate_service_request_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_number INTEGER;
    year_part TEXT;
BEGIN
    year_part := to_char(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(request_number FROM 'SR-' || year_part || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM service_requests
    WHERE request_number LIKE 'SR-' || year_part || '-%';
    
    NEW.request_number := 'SR-' || year_part || '-' || LPAD(next_number::TEXT, 5, '0');
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION generate_asset_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(asset_code FROM 'AST-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM assets;
    
    NEW.asset_code := 'AST-' || LPAD(next_number::TEXT, 6, '0');
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION create_qr_for_asset()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO qr_codes (asset_id, society_id, claimed_by, claimed_at, created_by)
    VALUES (NEW.id, NEW.society_id, NEW.created_by, CURRENT_TIMESTAMP, NEW.created_by);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION deduct_stock_on_material_use()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.stock_batch_id IS NOT NULL THEN
        UPDATE stock_batches
        SET current_quantity = current_quantity - NEW.quantity,
            status = CASE 
                WHEN current_quantity - NEW.quantity <= 0 THEN 'depleted'
                ELSE status
            END
        WHERE id = NEW.stock_batch_id;
    END IF;
    RETURN NEW;
END;
$$;;
