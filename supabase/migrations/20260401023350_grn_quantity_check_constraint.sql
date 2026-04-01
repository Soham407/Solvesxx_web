
-- Migration: Add quantity coherence check constraint to material_receipt_items
-- Created: 2026-04-01

ALTER TABLE material_receipt_items 
ADD CONSTRAINT material_receipt_items_quantity_coherence 
CHECK (
  (accepted_quantity IS NULL OR accepted_quantity >= 0) AND
  (rejected_quantity IS NULL OR rejected_quantity >= 0) AND
  (received_quantity >= 0) AND
  (COALESCE(accepted_quantity, 0) + COALESCE(rejected_quantity, 0) <= received_quantity)
);
