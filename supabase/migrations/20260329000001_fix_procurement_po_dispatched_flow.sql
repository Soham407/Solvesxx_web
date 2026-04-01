-- ============================================
-- Migration: fix_procurement_po_dispatched_flow
-- Description: Align PO transition RPCs with dispatched procurement workflow and receipt updates.
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'purchase_orders_status_enum'
  ) THEN
    ALTER TYPE public.purchase_orders_status_enum ADD VALUE IF NOT EXISTS 'dispatched';
  ELSIF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'po_status'
  ) THEN
    ALTER TYPE public.po_status ADD VALUE IF NOT EXISTS 'dispatched';
  END IF;
END
$$;

ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS vehicle_details TEXT,
ADD COLUMN IF NOT EXISTS dispatch_notes TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

DROP FUNCTION IF EXISTS transition_po_status(UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION transition_po_status(
  p_po_id UUID,
  p_new_status TEXT,
  p_user_id UUID,
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
  SELECT status INTO v_current_status
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
    status = p_new_status,
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

CREATE OR REPLACE FUNCTION update_po_receipt_status(
  p_po_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status TEXT;
  v_total_ordered NUMERIC;
  v_total_received NUMERIC;
  v_new_status TEXT;
BEGIN
  SELECT status INTO v_current_status
  FROM purchase_orders
  WHERE id = p_po_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase order not found');
  END IF;

  IF v_current_status NOT IN ('acknowledged', 'dispatched', 'partial_received') THEN
    RETURN jsonb_build_object('success', false, 'error', format('Cannot auto-update receipt status from "%s"', v_current_status));
  END IF;

  SELECT
    COALESCE(SUM(ordered_quantity), 0),
    COALESCE(SUM(received_quantity), 0)
  INTO v_total_ordered, v_total_received
  FROM purchase_order_items
  WHERE purchase_order_id = p_po_id;

  IF v_total_received >= v_total_ordered THEN
    v_new_status := 'received';
  ELSIF v_total_received > 0 AND v_current_status IN ('acknowledged', 'dispatched') THEN
    v_new_status := 'partial_received';
  ELSE
    RETURN jsonb_build_object('success', true, 'status', v_current_status, 'changed', false);
  END IF;

  UPDATE purchase_orders
  SET status = v_new_status, updated_at = NOW(), updated_by = p_user_id
  WHERE id = p_po_id;

  RETURN jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', v_new_status,
    'changed', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION transition_po_status(UUID, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION update_po_receipt_status(UUID, UUID) TO authenticated;
