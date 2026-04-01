
-- Migration: Fix GRN item quality gate trigger
-- Created: 2026-04-02

-- Update Trigger Function for stock_transactions to include reference_type check
CREATE OR REPLACE FUNCTION check_grn_item_quality()
RETURNS TRIGGER AS $$
DECLARE
    item_quality grn_item_quality_status;
BEGIN
    -- Check if reference_id and reference_type are provided and match GRN_ITEM
    IF NEW.reference_id IS NOT NULL AND NEW.reference_type = 'GRN_ITEM' THEN
        -- Check if this reference_id corresponds to a rejected GRN item in material_receipt_items
        SELECT quality_status INTO item_quality 
        FROM material_receipt_items 
        WHERE id = NEW.reference_id;
        
        IF FOUND AND item_quality = 'rejected' THEN
            RAISE EXCEPTION 'Cannot add rejected material to stock';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
