-- Fix create_po_from_supplier_request: the function jumps directly from
-- indent_forwarded → po_issued (rank diff = 3), which was blocked by the
-- enforce_request_status_transition trigger added in 20260405 (max diff = 2).
-- Fix: two-step transition indent_forwarded → indent_accepted → po_issued.
-- Both steps (diff 1, diff 2) satisfy the "> 2" guard.

CREATE OR REPLACE FUNCTION public.create_po_from_supplier_request(
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.requests%ROWTYPE;
  v_indent public.indents%ROWTYPE;
  v_existing_po_id UUID;
  v_po_id UUID;
  v_subtotal BIGINT := 0;
  v_tax BIGINT := 0;
  v_discount BIGINT := 0;
  v_shipping BIGINT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_request
  FROM public.requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.supplier_id IS NULL THEN
    RAISE EXCEPTION 'Request is not linked to a supplier';
  END IF;

  IF v_request.indent_id IS NULL THEN
    RAISE EXCEPTION 'Request is not linked to an indent';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND supplier_id = v_request.supplier_id
  ) THEN
    RAISE EXCEPTION 'Only the assigned supplier can create the linked purchase order';
  END IF;

  SELECT *
  INTO v_indent
  FROM public.indents
  WHERE id = v_request.indent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked indent not found';
  END IF;

  IF v_indent.status NOT IN ('approved', 'po_created') THEN
    RAISE EXCEPTION 'Only approved indents can be converted to purchase orders';
  END IF;

  SELECT id
  INTO v_existing_po_id
  FROM public.purchase_orders
  WHERE indent_id = v_request.indent_id
    AND supplier_id = v_request.supplier_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_po_id IS NOT NULL THEN
    -- Two-step transition to satisfy enforce_request_status_transition (max rank diff = 2):
    -- indent_forwarded(5) → indent_accepted(6) diff=1, then indent_accepted(6) → po_issued(8) diff=2
    IF v_request.status = 'indent_forwarded' THEN
      UPDATE public.requests
      SET status = 'indent_accepted', updated_at = NOW()
      WHERE id = p_request_id;
    END IF;

    UPDATE public.requests
    SET
      status = 'po_issued',
      rejection_reason = NULL,
      updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
      'success', true,
      'created', false,
      'purchase_order_id', v_existing_po_id
    );
  END IF;

  INSERT INTO public.purchase_orders (
    indent_id,
    supplier_id,
    po_date,
    expected_delivery_date,
    status,
    sent_to_vendor_at,
    notes,
    created_by,
    updated_by
  )
  VALUES (
    v_request.indent_id,
    v_request.supplier_id,
    CURRENT_DATE,
    v_request.preferred_delivery_date,
    'sent_to_vendor',
    NOW(),
    COALESCE(v_request.title, 'Supplier accepted indent')
      || ' | Auto-created from request '
      || COALESCE(v_request.request_number, p_request_id::TEXT),
    auth.uid(),
    auth.uid()
  )
  RETURNING id
  INTO v_po_id;

  INSERT INTO public.purchase_order_items (
    purchase_order_id,
    indent_item_id,
    product_id,
    item_description,
    specifications,
    ordered_quantity,
    unit_of_measure,
    unit_price,
    tax_rate,
    tax_amount,
    discount_percent,
    discount_amount,
    line_total,
    unmatched_qty,
    unmatched_amount,
    notes
  )
  SELECT
    v_po_id,
    ii.id,
    ii.product_id,
    ii.item_description,
    ii.specifications,
    COALESCE(ii.approved_quantity, ii.requested_quantity),
    ii.unit_of_measure,
    COALESCE(ii.estimated_unit_price, 0),
    0,
    0,
    0,
    0,
    ROUND(
      COALESCE(ii.estimated_unit_price, 0)::NUMERIC
      * COALESCE(ii.approved_quantity, ii.requested_quantity)
    )::BIGINT,
    COALESCE(ii.approved_quantity, ii.requested_quantity),
    ROUND(
      COALESCE(ii.estimated_unit_price, 0)::NUMERIC
      * COALESCE(ii.approved_quantity, ii.requested_quantity)
    )::BIGINT,
    ii.notes
  FROM public.indent_items ii
  WHERE ii.indent_id = v_request.indent_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.purchase_order_items
    WHERE purchase_order_id = v_po_id
  ) THEN
    RAISE EXCEPTION 'Linked indent has no items to convert into a purchase order';
  END IF;

  SELECT
    COALESCE(SUM(line_total), 0),
    COALESCE(SUM(tax_amount), 0),
    COALESCE(SUM(discount_amount), 0)
  INTO
    v_subtotal,
    v_tax,
    v_discount
  FROM public.purchase_order_items
  WHERE purchase_order_id = v_po_id;

  UPDATE public.purchase_orders
  SET
    subtotal = v_subtotal,
    tax_amount = v_tax,
    discount_amount = v_discount,
    grand_total = v_subtotal + v_tax - v_discount + v_shipping,
    updated_at = NOW()
  WHERE id = v_po_id;

  UPDATE public.indents
  SET
    status = 'po_created',
    linked_po_id = v_po_id,
    po_created_at = NOW(),
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = v_request.indent_id;

  -- Two-step transition: indent_forwarded → indent_accepted → po_issued
  IF v_request.status = 'indent_forwarded' THEN
    UPDATE public.requests
    SET status = 'indent_accepted', updated_at = NOW()
    WHERE id = p_request_id;
  END IF;

  UPDATE public.requests
  SET
    status = 'po_issued',
    rejection_reason = NULL,
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'created', true,
    'purchase_order_id', v_po_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_po_from_supplier_request(UUID) TO authenticated;
