
-- 1. Update Functions with Advisory Locks
CREATE OR REPLACE FUNCTION public.generate_service_request_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_number INTEGER;
    year_part TEXT;
BEGIN
    -- Acquire advisory lock to prevent race conditions (ID 43 for SR)
    PERFORM pg_advisory_xact_lock(43);
    
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

CREATE OR REPLACE FUNCTION public.generate_asset_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Acquire advisory lock to prevent race conditions (ID 42 for Assets)
    PERFORM pg_advisory_xact_lock(42);
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(asset_code FROM 'AST-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM assets;
    
    NEW.asset_code := 'AST-' || LPAD(next_number::TEXT, 6, '0');
    RETURN NEW;
END;
$$;

-- 2. Update Triggers (Drop and Recreate with correct WHEN clause)
DROP TRIGGER IF EXISTS trigger_generate_service_request_number ON service_requests;
CREATE TRIGGER trigger_generate_service_request_number
    BEFORE INSERT ON service_requests
    FOR EACH ROW
    WHEN (NEW.request_number IS NULL OR NEW.request_number = 'PENDING')
    EXECUTE FUNCTION generate_service_request_number();

DROP TRIGGER IF EXISTS trigger_generate_asset_code ON assets;
CREATE TRIGGER trigger_generate_asset_code
    BEFORE INSERT ON assets
    FOR EACH ROW
    WHEN (NEW.asset_code IS NULL)
    EXECUTE FUNCTION generate_asset_code();
;
