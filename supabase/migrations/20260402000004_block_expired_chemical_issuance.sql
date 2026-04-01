-- Migration: Block issuance of expired chemicals
-- Created: 2026-04-02

-- 1. Create DB function get_expiring_chemicals(days_ahead INT)
DROP FUNCTION IF EXISTS public.get_expiring_chemicals(INTEGER);

CREATE FUNCTION public.get_expiring_chemicals(p_days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
    id UUID,
    product_name TEXT,
    expiry_date DATE,
    batch_number TEXT,
    days_left INTEGER,
    severity TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pcc.id,
        p.product_name,
        pcc.expiry_date,
        pcc.batch_number,
        (pcc.expiry_date - CURRENT_DATE)::INTEGER as days_left,
        CASE 
            WHEN pcc.expiry_date < CURRENT_DATE THEN 'expired'
            WHEN (pcc.expiry_date - CURRENT_DATE) <= 7 THEN 'critical'
            WHEN (pcc.expiry_date - CURRENT_DATE) <= 30 THEN 'warning'
            ELSE 'healthy'
        END::TEXT as severity
    FROM public.pest_control_chemicals pcc
    JOIN public.products p ON pcc.product_id = p.id
    WHERE pcc.expiry_date IS NOT NULL
      AND pcc.expiry_date <= (CURRENT_DATE + p_days_ahead)
    ORDER BY pcc.expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create Trigger Function to block expired chemical issuance
CREATE OR REPLACE FUNCTION public.block_expired_chemical_issuance()
RETURNS TRIGGER AS $$
DECLARE
    v_expiry_date DATE;
    v_product_name TEXT;
    v_category_name TEXT;
BEGIN
    -- Only check for 'issue' type transactions
    IF LOWER(NEW.transaction_type) IN ('issue', 'out') THEN
        
        -- Check if product is a chemical
        SELECT pc.category_name, p.product_name 
        INTO v_category_name, v_product_name
        FROM public.products p
        LEFT JOIN public.product_categories pc ON p.category_id = pc.id
        WHERE p.id = NEW.product_id;

        -- If it's a chemical, check expiry from available sources
        IF v_category_name ILIKE '%chemical%' OR EXISTS (SELECT 1 FROM public.pest_control_chemicals WHERE product_id = NEW.product_id) THEN
            
            -- Prefer batch-specific expiry if batch_number is provided
            IF NEW.batch_number IS NOT NULL THEN
                SELECT expiry_date INTO v_expiry_date
                FROM public.stock_batches
                WHERE product_id = NEW.product_id AND batch_number = NEW.batch_number
                LIMIT 1;
            END IF;

            -- Fallback to pest_control_chemicals table if still null
            IF v_expiry_date IS NULL THEN
                SELECT expiry_date INTO v_expiry_date
                FROM public.pest_control_chemicals
                WHERE product_id = NEW.product_id
                LIMIT 1;
            END IF;

            -- Block if expired
            IF v_expiry_date IS NOT NULL AND v_expiry_date < CURRENT_DATE THEN
                RAISE EXCEPTION 'Cannot issue expired chemical: % (Expired on %)', v_product_name, v_expiry_date;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Apply Trigger to stock_transactions
DROP TRIGGER IF EXISTS trg_block_expired_chemical_issuance ON public.stock_transactions;
CREATE TRIGGER trg_block_expired_chemical_issuance
    BEFORE INSERT ON public.stock_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.block_expired_chemical_issuance();

-- 4. Add comments
COMMENT ON FUNCTION public.get_expiring_chemicals IS 'Returns chemicals expiring within the given number of days.';
COMMENT ON FUNCTION public.block_expired_chemical_issuance IS 'Blocks issuance of chemicals if they are past their expiry date.';
