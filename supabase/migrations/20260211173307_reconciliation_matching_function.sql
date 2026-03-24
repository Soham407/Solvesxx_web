-- Migration: Three-Way Reconciliation Matching Function
-- Moves reconciliation matching logic to the database to prevent client-side manipulation.
-- Enforces variance tolerance checks and valid status transitions.

-- Variance tolerance: 100 paise = 1.00 INR
CREATE OR REPLACE FUNCTION execute_reconciliation_match(
  p_reconciliation_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recon RECORD;
  v_po_id UUID;
  v_bill_id UUID;
  v_grn_id UUID;
  v_line RECORD;
  v_product_ids UUID[];
  v_product_id UUID;
  v_po_qty NUMERIC;
  v_po_price NUMERIC;
  v_po_item_id UUID;
  v_grn_qty NUMERIC;
  v_grn_price NUMERIC;
  v_grn_item_id UUID;
  v_bill_qty NUMERIC;
  v_bill_price NUMERIC;
  v_bill_item_id UUID;
  v_matched_qty NUMERIC;
  v_qty_variance NUMERIC;
  v_price_variance NUMERIC;
  v_matched_amount NUMERIC;
  v_base_price NUMERIC;
  v_match_type TEXT;
  v_line_status TEXT;
  v_all_matched BOOLEAN := TRUE;
  v_any_variance BOOLEAN := FALSE;
  v_lines_created INT := 0;
  VARIANCE_TOLERANCE CONSTANT NUMERIC := 100; -- in paise
BEGIN
  -- 1. Lock and fetch reconciliation
  SELECT * INTO v_recon
  FROM reconciliations
  WHERE id = p_reconciliation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reconciliation not found');
  END IF;

  IF v_recon.status NOT IN ('pending', 'discrepancy') THEN
    RETURN jsonb_build_object('success', false, 'error', format('Cannot run matching on reconciliation in "%s" status', v_recon.status));
  END IF;

  v_po_id := v_recon.purchase_order_id;
  v_bill_id := v_recon.purchase_bill_id;
  v_grn_id := v_recon.material_receipt_id;

  -- 2. Delete existing lines (re-run)
  DELETE FROM reconciliation_lines WHERE reconciliation_id = p_reconciliation_id;

  -- 3. Collect all unique product IDs across all documents
  SELECT ARRAY_AGG(DISTINCT product_id) INTO v_product_ids
  FROM (
    SELECT product_id FROM purchase_order_items WHERE purchase_order_id = v_po_id AND v_po_id IS NOT NULL
    UNION
    SELECT product_id FROM material_receipt_items WHERE material_receipt_id = v_grn_id AND v_grn_id IS NOT NULL
    UNION
    SELECT product_id FROM purchase_bill_items WHERE purchase_bill_id = v_bill_id AND v_bill_id IS NOT NULL
  ) AS all_products;

  IF v_product_ids IS NULL OR array_length(v_product_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No items found in linked documents');
  END IF;

  -- 4. For each product, perform matching
  FOREACH v_product_id IN ARRAY v_product_ids
  LOOP
    -- Initialize
    v_po_qty := NULL; v_po_price := NULL; v_po_item_id := NULL;
    v_grn_qty := NULL; v_grn_price := NULL; v_grn_item_id := NULL;
    v_bill_qty := NULL; v_bill_price := NULL; v_bill_item_id := NULL;

    -- Fetch PO item
    IF v_po_id IS NOT NULL THEN
      SELECT id, ordered_quantity, unit_price
      INTO v_po_item_id, v_po_qty, v_po_price
      FROM purchase_order_items
      WHERE purchase_order_id = v_po_id AND product_id = v_product_id
      LIMIT 1;
    END IF;

    -- Fetch GRN item (prefer accepted_quantity)
    IF v_grn_id IS NOT NULL THEN
      SELECT id,
        COALESCE(accepted_quantity, received_quantity),
        unit_price
      INTO v_grn_item_id, v_grn_qty, v_grn_price
      FROM material_receipt_items
      WHERE material_receipt_id = v_grn_id AND product_id = v_product_id
      LIMIT 1;
    END IF;

    -- Fetch Bill item
    IF v_bill_id IS NOT NULL THEN
      SELECT id, billed_quantity, unit_price
      INTO v_bill_item_id, v_bill_qty, v_bill_price
      FROM purchase_bill_items
      WHERE purchase_bill_id = v_bill_id AND product_id = v_product_id
      LIMIT 1;
    END IF;

    -- Determine match type
    IF v_po_item_id IS NOT NULL AND v_grn_item_id IS NOT NULL AND v_bill_item_id IS NOT NULL THEN
      v_match_type := 'THREE_WAY';
    ELSIF v_po_item_id IS NOT NULL AND v_grn_item_id IS NOT NULL THEN
      v_match_type := 'PO_GRN';
    ELSIF v_grn_item_id IS NOT NULL AND v_bill_item_id IS NOT NULL THEN
      v_match_type := 'GRN_BILL';
    ELSE
      v_match_type := 'PO_BILL';
    END IF;

    -- Calculate matched quantity (minimum of available quantities)
    v_matched_qty := LEAST(
      COALESCE(v_po_qty, 999999999),
      COALESCE(v_grn_qty, 999999999),
      COALESCE(v_bill_qty, 999999999)
    );
    IF v_matched_qty >= 999999999 THEN
      v_matched_qty := 0;
    END IF;

    -- Calculate quantity variance
    IF v_bill_qty IS NOT NULL AND v_grn_qty IS NOT NULL THEN
      v_qty_variance := v_bill_qty - v_grn_qty;
    ELSIF v_bill_qty IS NOT NULL AND v_po_qty IS NOT NULL THEN
      v_qty_variance := v_bill_qty - v_po_qty;
    ELSIF v_grn_qty IS NOT NULL AND v_po_qty IS NOT NULL THEN
      v_qty_variance := v_grn_qty - v_po_qty;
    ELSE
      v_qty_variance := 0;
    END IF;

    -- Calculate price variance
    IF v_bill_price IS NOT NULL AND v_po_price IS NOT NULL THEN
      v_price_variance := v_bill_price - v_po_price;
    ELSIF v_bill_price IS NOT NULL AND v_grn_price IS NOT NULL THEN
      v_price_variance := v_bill_price - v_grn_price;
    ELSE
      v_price_variance := 0;
    END IF;

    -- Base price for matched amount
    v_base_price := COALESCE(v_po_price, v_grn_price, v_bill_price, 0);
    v_matched_amount := ROUND(v_matched_qty * v_base_price, 2);

    -- Determine line status
    IF v_po_item_id IS NULL OR v_grn_item_id IS NULL OR v_bill_item_id IS NULL THEN
      v_line_status := 'pending';
      v_all_matched := FALSE;
    ELSIF ABS(v_qty_variance) < 0.01 AND ABS(v_price_variance) <= VARIANCE_TOLERANCE THEN
      v_line_status := 'matched';
    ELSE
      v_line_status := 'variance';
      v_any_variance := TRUE;
      v_all_matched := FALSE;
    END IF;

    -- Insert reconciliation line
    INSERT INTO reconciliation_lines (
      reconciliation_id, po_item_id, grn_item_id, bill_item_id, product_id,
      matched_qty, matched_amount,
      po_unit_price, grn_unit_price, bill_unit_price,
      unit_price_variance, qty_ordered, qty_received, qty_billed, qty_variance,
      match_type, status
    ) VALUES (
      p_reconciliation_id, v_po_item_id, v_grn_item_id, v_bill_item_id, v_product_id,
      v_matched_qty, v_matched_amount,
      COALESCE(v_po_price, 0), COALESCE(v_grn_price, 0), COALESCE(v_bill_price, 0),
      v_price_variance,
      COALESCE(v_po_qty, 0), COALESCE(v_grn_qty, 0), COALESCE(v_bill_qty, 0),
      v_qty_variance,
      v_match_type, v_line_status
    );

    v_lines_created := v_lines_created + 1;

    -- Update residual tracking on source items
    IF v_po_item_id IS NOT NULL AND v_matched_qty > 0 THEN
      UPDATE purchase_order_items
      SET
        unmatched_qty = GREATEST(0, COALESCE(unmatched_qty, ordered_quantity) - v_matched_qty),
        unmatched_amount = ROUND(GREATEST(0, COALESCE(unmatched_qty, ordered_quantity) - v_matched_qty) * unit_price, 2)
      WHERE id = v_po_item_id;
    END IF;

    IF v_grn_item_id IS NOT NULL AND v_matched_qty > 0 THEN
      UPDATE material_receipt_items
      SET
        unmatched_qty = GREATEST(0, COALESCE(unmatched_qty, COALESCE(accepted_quantity, received_quantity)) - v_matched_qty),
        unmatched_amount = ROUND(GREATEST(0, COALESCE(unmatched_qty, COALESCE(accepted_quantity, received_quantity)) - v_matched_qty) * unit_price, 2)
      WHERE id = v_grn_item_id;
    END IF;

    IF v_bill_item_id IS NOT NULL AND v_matched_qty > 0 THEN
      UPDATE purchase_bill_items
      SET
        unmatched_qty = GREATEST(0, COALESCE(unmatched_qty, billed_quantity) - v_matched_qty),
        unmatched_amount = ROUND(GREATEST(0, COALESCE(unmatched_qty, billed_quantity) - v_matched_qty) * unit_price, 2)
      WHERE id = v_bill_item_id;
    END IF;
  END LOOP;

  -- 5. Update reconciliation header status
  UPDATE reconciliations
  SET
    status = CASE
      WHEN v_all_matched THEN 'matched'
      WHEN v_any_variance THEN 'discrepancy'
      ELSE 'pending'
    END,
    updated_at = NOW(),
    updated_by = p_user_id
  WHERE id = p_reconciliation_id;

  RETURN jsonb_build_object(
    'success', true,
    'lines_created', v_lines_created,
    'status', CASE
      WHEN v_all_matched THEN 'matched'
      WHEN v_any_variance THEN 'discrepancy'
      ELSE 'pending'
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION execute_reconciliation_match(UUID, UUID) TO authenticated;;
