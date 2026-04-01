-- =============================================================================
-- Migration: 20260401000005_service_supplier_acknowledgment_hardening.sql
-- Purpose:
-- 1. Backfill missed service requests using all service-deployment fields.
-- 2. Align service_acknowledgments with the RPC/runtime contract.
-- 3. Replace supplier_transition_service_po_status so it does not depend on
--    a missing UNIQUE(spo_id) constraint and can persist acknowledgment notes.
-- =============================================================================

UPDATE public.requests
SET is_service_request = true
WHERE is_service_request = false
  AND (
    COALESCE(service_type, '') <> ''
    OR COALESCE(service_grade, '') <> ''
    OR COALESCE(headcount, 0) > 0
    OR COALESCE(shift, '') <> ''
    OR start_date IS NOT NULL
    OR COALESCE(duration_months, 0) > 0
  );

ALTER TABLE public.service_acknowledgments
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'acknowledged',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.service_acknowledgments
SET status = COALESCE(status, 'acknowledged'),
    updated_at = COALESCE(updated_at, acknowledged_at, created_at, NOW());

DROP FUNCTION IF EXISTS public.supplier_transition_service_po_status(UUID, TEXT, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION public.supplier_transition_service_po_status(
  p_spo_id UUID,
  p_new_status TEXT,
  p_headcount_expected INTEGER DEFAULT NULL,
  p_grade_verified BOOLEAN DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spo public.service_purchase_orders%ROWTYPE;
  v_supplier_id UUID;
  v_total_headcount INTEGER := 0;
  v_notes TEXT := NULLIF(BTRIM(p_notes), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT supplier_id
  INTO v_supplier_id
  FROM public.users
  WHERE id = auth.uid();

  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is not linked to a supplier';
  END IF;

  SELECT *
  INTO v_spo
  FROM public.service_purchase_orders
  WHERE id = p_spo_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service purchase order not found';
  END IF;

  IF v_spo.vendor_id IS DISTINCT FROM v_supplier_id THEN
    RAISE EXCEPTION 'Only the assigned supplier can transition this service purchase order';
  END IF;

  IF p_new_status NOT IN ('acknowledged', 'delivery_note_uploaded', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Unsupported service purchase order transition: %', p_new_status;
  END IF;

  IF p_new_status = 'acknowledged' AND v_spo.status <> 'sent_to_vendor' THEN
    RAISE EXCEPTION 'Only sent service purchase orders can be acknowledged';
  END IF;

  IF p_new_status = 'delivery_note_uploaded'
     AND v_spo.status NOT IN ('acknowledged', 'in_progress', 'delivery_note_uploaded') THEN
    RAISE EXCEPTION 'Delivery note upload requires an acknowledged service purchase order';
  END IF;

  IF v_spo.status = p_new_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'changed', false,
      'service_purchase_order_id', v_spo.id,
      'status', v_spo.status
    );
  END IF;

  UPDATE public.service_purchase_orders
  SET
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_spo_id;

  IF p_new_status = 'acknowledged' THEN
    IF p_headcount_expected IS NULL THEN
      SELECT COALESCE(SUM(quantity), 0)
      INTO v_total_headcount
      FROM public.service_purchase_order_items
      WHERE spo_id = p_spo_id;
    ELSE
      v_total_headcount := p_headcount_expected;
    END IF;

    UPDATE public.service_acknowledgments
    SET
      acknowledged_by = auth.uid(),
      headcount_expected = v_total_headcount,
      grade_verified = COALESCE(p_grade_verified, grade_verified),
      notes = COALESCE(v_notes, notes),
      status = 'acknowledged',
      acknowledged_at = COALESCE(acknowledged_at, NOW()),
      updated_at = NOW()
    WHERE spo_id = p_spo_id;

    IF NOT FOUND THEN
      INSERT INTO public.service_acknowledgments (
        spo_id,
        acknowledged_by,
        headcount_expected,
        headcount_received,
        grade_verified,
        notes,
        status,
        acknowledged_at,
        created_at,
        updated_at
      )
      VALUES (
        p_spo_id,
        auth.uid(),
        v_total_headcount,
        0,
        p_grade_verified,
        v_notes,
        'acknowledged',
        NOW(),
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'changed', true,
    'service_purchase_order_id', p_spo_id,
    'status', p_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.supplier_transition_service_po_status(UUID, TEXT, INTEGER, BOOLEAN, TEXT) TO authenticated;
