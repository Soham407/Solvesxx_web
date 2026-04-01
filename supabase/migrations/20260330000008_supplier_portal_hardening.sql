-- =============================================================================
-- Migration: 20260330000008_supplier_portal_hardening.sql
-- Purpose:   Close the SUPPLIER-001 workflow gaps across indent acceptance,
--            supplier self-service, service purchase orders, and service
--            acknowledgment visibility.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Supplier autonomy: missing profile fields + scoped self-service RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS rates TEXT,
  ADD COLUMN IF NOT EXISTS availability TEXT;

DROP POLICY IF EXISTS "suppliers_admin_full" ON public.suppliers;
CREATE POLICY "suppliers_admin_full" ON public.suppliers
  FOR ALL TO authenticated
  USING (get_my_app_role() IN ('admin', 'super_admin', 'account', 'company_hod'))
  WITH CHECK (get_my_app_role() IN ('admin', 'super_admin', 'account', 'company_hod'));

DROP POLICY IF EXISTS "suppliers_self_update" ON public.suppliers;
CREATE POLICY "suppliers_self_update" ON public.suppliers
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT supplier_id
      FROM public.users
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT supplier_id
      FROM public.users
      WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Service SPO hardening: supplier visibility for supplier/vendor roles,
-- supplier-side acknowledgment transitions, and database-generated SPO numbers
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "spo_supplier_select" ON public.service_purchase_orders;
CREATE POLICY "spo_supplier_select" ON public.service_purchase_orders
  FOR SELECT TO authenticated
  USING (
    get_my_app_role() IN ('supplier', 'vendor')
    AND vendor_id IN (
      SELECT supplier_id
      FROM public.users
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "spo_items_supplier_select" ON public.service_purchase_order_items;
CREATE POLICY "spo_items_supplier_select" ON public.service_purchase_order_items
  FOR SELECT TO authenticated
  USING (
    get_my_app_role() IN ('supplier', 'vendor')
    AND spo_id IN (
      SELECT id
      FROM public.service_purchase_orders
      WHERE vendor_id IN (
        SELECT supplier_id
        FROM public.users
        WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "svc_ack_supplier_select" ON public.service_acknowledgments;
CREATE POLICY "svc_ack_supplier_select" ON public.service_acknowledgments
  FOR SELECT TO authenticated
  USING (
    get_my_app_role() IN ('supplier', 'vendor')
    AND spo_id IN (
      SELECT id
      FROM public.service_purchase_orders
      WHERE vendor_id IN (
        SELECT supplier_id
        FROM public.users
        WHERE id = auth.uid()
      )
    )
  );

CREATE SEQUENCE IF NOT EXISTS public.service_purchase_order_number_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_service_purchase_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.spo_number IS NULL OR NEW.spo_number = '' THEN
    NEW.spo_number := 'SPO-' || LPAD(nextval('public.service_purchase_order_number_seq')::TEXT, 5, '0');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_service_purchase_order_number ON public.service_purchase_orders;
CREATE TRIGGER set_service_purchase_order_number
  BEFORE INSERT ON public.service_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_service_purchase_order_number();

CREATE OR REPLACE FUNCTION public.supplier_transition_service_po_status(
  p_spo_id UUID,
  p_new_status TEXT,
  p_headcount_expected INTEGER DEFAULT NULL,
  p_grade_verified BOOLEAN DEFAULT NULL
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

  -- Update the status
  UPDATE public.service_purchase_orders
  SET
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_spo_id;

  -- If acknowledging, create or update service acknowledgment
  IF p_new_status = 'acknowledged' THEN
    -- Calculate expected headcount if not provided
    IF p_headcount_expected IS NULL THEN
      SELECT COALESCE(SUM(quantity), 0)
      INTO v_total_headcount
      FROM public.service_purchase_order_items
      WHERE spo_id = p_spo_id;
    ELSE
      v_total_headcount := p_headcount_expected;
    END IF;

    -- Insert initial acknowledgment record
    INSERT INTO public.service_acknowledgments (
      spo_id,
      acknowledged_by,
      headcount_expected,
      headcount_received,
      grade_verified,
      status,
      created_at
    )
    VALUES (
      p_spo_id,
      auth.uid(),
      v_total_headcount,
      0, -- Received is 0 at receipt acknowledgment
      COALESCE(p_grade_verified, false),
      'acknowledged',
      NOW()
    )
    ON CONFLICT (spo_id) DO UPDATE
    SET
      headcount_expected = v_total_headcount,
      grade_verified = COALESCE(p_grade_verified, service_acknowledgments.grade_verified),
      updated_at = NOW();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'changed', true,
    'service_purchase_order_id', p_spo_id,
    'status', p_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.supplier_transition_service_po_status(UUID, TEXT, INTEGER, BOOLEAN) TO authenticated;

-- Service delivery notes were created for staffing/service SPOs but pointed at
-- material purchase_orders. Repoint the FK so supplier SPO delivery notes can persist.
ALTER TABLE public.service_delivery_notes
  DROP CONSTRAINT IF EXISTS service_delivery_notes_po_id_fkey;

ALTER TABLE public.service_delivery_notes
  ADD CONSTRAINT service_delivery_notes_po_id_fkey
  FOREIGN KEY (po_id)
  REFERENCES public.service_purchase_orders(id)
  ON DELETE CASCADE
  NOT VALID;

-- ---------------------------------------------------------------------------
-- Indent acceptance -> PO creation automation
-- ---------------------------------------------------------------------------
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
