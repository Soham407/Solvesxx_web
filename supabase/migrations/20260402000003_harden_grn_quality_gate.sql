
-- Migration: Harden GRN item quality gate (search path and robustness)
-- Created: 2026-04-02

-- Update Trigger Function for stock_transactions with secure search_path
CREATE OR REPLACE FUNCTION public.check_grn_item_quality()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
    item_quality grn_item_quality_status;
BEGIN
    -- Only check for GRN_ITEM reference types
    IF NEW.reference_type = 'GRN_ITEM' AND NEW.reference_id IS NOT NULL THEN
        -- Check if this reference_id corresponds to a rejected GRN item
        SELECT quality_status INTO item_quality 
        FROM material_receipt_items 
        WHERE id = NEW.reference_id;
        
        IF FOUND AND item_quality = 'rejected'::grn_item_quality_status THEN
            RAISE EXCEPTION 'Cannot add rejected material to stock (GRN Item: %)', NEW.reference_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;
