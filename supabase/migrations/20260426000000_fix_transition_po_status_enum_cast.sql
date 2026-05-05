-- Fix transition_po_status:
--   1. status = p_new_status  →  status = p_new_status::po_status
--      (status column is a po_status enum; direct TEXT assignment causes a runtime type error)
--   2. p_user_id UUID DEFAULT NULL
--      (no DEFAULT meant passing NULL/undefined from JS produced a PostgREST function-not-found error)

DROP FUNCTION IF EXISTS transition_po_status(UUID, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS transition_po_status(UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION transition_po_status(
  p_po_id UUID,
  p_new_status TEXT,
  p_user_id UUID DEFAULT NULL,
  p_vehicle_details TEXT DEFAULT NULL,
  p_dispatch_notes TEXT DEFAULT NULL,
  p_dispatched_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status TEXT;
  v_valid_transitions JSONB := '{
    "draft": ["sent_to_vendor", "cancelled"],
    "sent_to_vendor": ["acknowledged", "cancelled"],
    "acknowledged": ["dispatched", "partial_received", "received"],
    "dispatched": ["partial_received", "received"],
    "partial_received": ["received"],
    "received": [],
    "cancelled": []
  }'::JSONB;
  v_allowed JSONB;
  v_item_count INT;
BEGIN
  SELECT status::TEXT INTO v_current_status
  FROM purchase_orders
  WHERE id = p_po_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase order not found');
  END IF;

  v_allowed := v_valid_transitions -> v_current_status;

  IF v_allowed IS NULL OR NOT v_allowed ? p_new_status THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Invalid status transition from "%s" to "%s"', v_current_status, p_new_status)
    );
  END IF;

  IF p_new_status = 'sent_to_vendor' THEN
    SELECT COUNT(*) INTO v_item_count
    FROM purchase_order_items
    WHERE purchase_order_id = p_po_id;

    IF v_item_count = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot send PO to vendor without line items');
    END IF;
  END IF;

  UPDATE purchase_orders
  SET
    status = p_new_status::po_status,
    updated_at = NOW(),
    updated_by = p_user_id,
    sent_to_vendor_at = CASE WHEN p_new_status = 'sent_to_vendor' THEN NOW() ELSE sent_to_vendor_at END,
    vendor_acknowledged_at = CASE WHEN p_new_status = 'acknowledged' THEN NOW() ELSE vendor_acknowledged_at END,
    dispatched_at = CASE WHEN p_new_status = 'dispatched' THEN COALESCE(p_dispatched_at, NOW()) ELSE dispatched_at END,
    vehicle_details = CASE WHEN p_new_status = 'dispatched' THEN p_vehicle_details ELSE vehicle_details END,
    dispatch_notes = CASE WHEN p_new_status = 'dispatched' THEN p_dispatch_notes ELSE dispatch_notes END
  WHERE id = p_po_id;

  RETURN jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION transition_po_status(UUID, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
