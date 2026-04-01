-- =============================================================================
-- Migration: 20260401000003_fix_finance_payout_validation_for_services.sql
-- Purpose:   Update validate_bill_for_payout to support service purchase orders.
--            Ensures that bills linked to SPOs (which lack material receipts)
--            can pass validation if they are reconciled or if they match the SPO.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_bill_for_payout(p_bill_id UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  message TEXT,
  match_status TEXT,
  po_total NUMERIC,
  grn_total NUMERIC,
  bill_total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po_id UUID;
  v_spo_id UUID;
  v_grn_id UUID;
  v_payment_status TEXT;
BEGIN
  SELECT
    pb.total_amount,
    COALESCE(pb.match_status, 'pending'),
    pb.payment_status,
    pb.purchase_order_id,
    pb.service_purchase_order_id,
    pb.material_receipt_id
  INTO bill_total, match_status, v_payment_status, v_po_id, v_spo_id, v_grn_id
  FROM public.purchase_bills pb
  WHERE pb.id = p_bill_id;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      FALSE,
      'Bill not found.'::TEXT,
      'pending'::TEXT,
      0::NUMERIC,
      0::NUMERIC,
      0::NUMERIC;
    RETURN;
  END IF;

  -- 1. Get PO/SPO Total
  IF v_po_id IS NOT NULL THEN
    SELECT COALESCE(po.grand_total, 0)
    INTO po_total
    FROM public.purchase_orders po
    WHERE po.id = v_po_id;
  ELSIF v_spo_id IS NOT NULL THEN
    SELECT COALESCE(spo.total_amount, 0)
    INTO po_total
    FROM public.service_purchase_orders spo
    WHERE spo.id = v_spo_id;
  ELSE
    po_total := 0;
  END IF;
  po_total := COALESCE(po_total, 0);

  -- 2. Get GRN/Acknowledgment Total
  IF v_grn_id IS NOT NULL THEN
    SELECT COALESCE(grn.total_received_value, 0)
    INTO grn_total
    FROM public.material_receipts grn
    WHERE grn.id = v_grn_id;
  ELSIF v_spo_id IS NOT NULL THEN
    -- For services, we check if there is an acknowledgment. 
    -- If acknowledged, we treat the 'receipt value' as matching the bill for now,
    -- as service acknowledgments are headcount-based rather than value-based.
    IF EXISTS (
      SELECT 1 FROM public.service_acknowledgments 
      WHERE spo_id = v_spo_id AND status = 'acknowledged'
    ) THEN
      grn_total := bill_total;
    ELSE
      grn_total := 0;
    END IF;
  ELSE
    grn_total := 0;
  END IF;
  grn_total := COALESCE(grn_total, 0);

  -- 3. Validation Logic
  IF v_payment_status = 'paid' THEN
    RETURN QUERY
    SELECT
      FALSE,
      'Bill is already fully paid.'::TEXT,
      match_status,
      po_total,
      grn_total,
      bill_total;
  ELSIF match_status IN ('matched', 'force_matched') THEN
    RETURN QUERY
    SELECT
      TRUE,
      'Bill is valid for payout.'::TEXT,
      match_status,
      po_total,
      grn_total,
      bill_total;
  ELSIF v_spo_id IS NOT NULL AND grn_total > 0 AND bill_total <= po_total THEN
    -- Special Case: Service POs can be paid if acknowledged and bill <= SPO total
    RETURN QUERY
    SELECT
      TRUE,
      'Service deployment verified. Valid for payout.'::TEXT,
      'matched'::TEXT,
      po_total,
      grn_total,
      bill_total;
  ELSE
    RETURN QUERY
    SELECT
      FALSE,
      'Reconciliation mismatch detected. Requires manual Force Match by Finance Admin.'::TEXT,
      match_status,
      po_total,
      grn_total,
      bill_total;
  END IF;
END;
$$;
