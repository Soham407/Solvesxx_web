
-- Migration: Add GRN item quality gate
-- Created: 2026-04-01

-- 1. Create the new ENUM type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grn_item_quality_status') THEN
        CREATE TYPE grn_item_quality_status AS ENUM ('accepted', 'rejected', 'partial');
    END IF;
END $$;

-- 2. Alter material_receipt_items (grn_items)
-- First, drop the check constraint if it exists
DO $$ 
BEGIN
    ALTER TABLE material_receipt_items DROP CONSTRAINT IF EXISTS material_receipt_items_quality_status_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Temporarily change column to text to allow conversion
ALTER TABLE material_receipt_items ALTER COLUMN quality_status TYPE TEXT;

-- Update existing values to match new ENUM
UPDATE material_receipt_items 
SET quality_status = CASE 
    WHEN quality_status IN ('good', 'pending') THEN 'accepted'
    WHEN quality_status IN ('damaged', 'rejected') THEN 'rejected'
    WHEN quality_status = 'partial' THEN 'partial'
    ELSE 'accepted'
END;

-- Change column type to the new ENUM
ALTER TABLE material_receipt_items 
    ALTER COLUMN quality_status TYPE grn_item_quality_status 
    USING quality_status::grn_item_quality_status;

-- Set default
ALTER TABLE material_receipt_items ALTER COLUMN quality_status SET DEFAULT 'accepted';

-- 3. Create Trigger for stock_transactions
CREATE OR REPLACE FUNCTION check_grn_item_quality()
RETURNS TRIGGER AS $$
DECLARE
    item_quality grn_item_quality_status;
BEGIN
    -- Check if reference_id is provided
    IF NEW.reference_id IS NOT NULL THEN
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

DROP TRIGGER IF EXISTS trg_check_grn_item_quality ON stock_transactions;
CREATE TRIGGER trg_check_grn_item_quality
    BEFORE INSERT ON stock_transactions
    FOR EACH ROW
    EXECUTE FUNCTION check_grn_item_quality();
