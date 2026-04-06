-- =============================================================================
-- Security Ops oversight tickets
-- Unified mobile-facing oversight tickets, evidence storage, and delivery prefill.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.oversight_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE,
  ticket_type TEXT NOT NULL,
  material_issue_type TEXT,
  source_visitor_id UUID REFERENCES public.visitors(id) ON DELETE SET NULL,
  parent_ticket_id UUID REFERENCES public.oversight_tickets(id) ON DELETE SET NULL,
  linked_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  subject_name TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  note TEXT NOT NULL,
  evidence_urls JSONB NOT NULL DEFAULT '[]'::JSONB,
  batch_number TEXT,
  ordered_quantity NUMERIC,
  received_quantity NUMERIC,
  shortage_quantity NUMERIC,
  return_quantity NUMERIC,
  inspection_outcome TEXT,
  location_name TEXT,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oversight_tickets_ticket_type_check'
  ) THEN
    ALTER TABLE public.oversight_tickets
      ADD CONSTRAINT oversight_tickets_ticket_type_check
      CHECK (ticket_type IN ('behavior', 'material', 'return'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oversight_tickets_material_issue_type_check'
  ) THEN
    ALTER TABLE public.oversight_tickets
      ADD CONSTRAINT oversight_tickets_material_issue_type_check
      CHECK (material_issue_type IS NULL OR material_issue_type IN ('quality', 'quantity'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oversight_tickets_severity_check'
  ) THEN
    ALTER TABLE public.oversight_tickets
      ADD CONSTRAINT oversight_tickets_severity_check
      CHECK (severity IN ('low', 'medium', 'high', 'critical'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oversight_tickets_status_check'
  ) THEN
    ALTER TABLE public.oversight_tickets
      ADD CONSTRAINT oversight_tickets_status_check
      CHECK (status IN ('open', 'acknowledged', 'closed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oversight_tickets_inspection_outcome_check'
  ) THEN
    ALTER TABLE public.oversight_tickets
      ADD CONSTRAINT oversight_tickets_inspection_outcome_check
      CHECK (inspection_outcome IS NULL OR inspection_outcome IN ('approved', 'rejected'));
  END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.oversight_ticket_seq START WITH 1000;

CREATE OR REPLACE FUNCTION public.generate_oversight_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR BTRIM(NEW.ticket_number) = '' THEN
    NEW.ticket_number := 'OVS-' || LPAD(NEXTVAL('public.oversight_ticket_seq')::TEXT, 5, '0');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_generate_oversight_ticket_number ON public.oversight_tickets;
CREATE TRIGGER tr_generate_oversight_ticket_number
BEFORE INSERT ON public.oversight_tickets
FOR EACH ROW
EXECUTE FUNCTION public.generate_oversight_ticket_number();

DROP TRIGGER IF EXISTS tr_update_oversight_tickets_updated_at ON public.oversight_tickets;
CREATE TRIGGER tr_update_oversight_tickets_updated_at
BEFORE UPDATE ON public.oversight_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_oversight_tickets_status_created
  ON public.oversight_tickets(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_oversight_tickets_source_visitor
  ON public.oversight_tickets(source_visitor_id);

CREATE INDEX IF NOT EXISTS idx_oversight_tickets_parent
  ON public.oversight_tickets(parent_ticket_id);

ALTER TABLE public.oversight_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oversight_tickets_select ON public.oversight_tickets;
CREATE POLICY oversight_tickets_select ON public.oversight_tickets
FOR SELECT TO authenticated
USING (
  get_my_app_role() IN ('admin', 'super_admin', 'security_supervisor', 'society_manager')
);

DROP POLICY IF EXISTS oversight_tickets_insert ON public.oversight_tickets;
CREATE POLICY oversight_tickets_insert ON public.oversight_tickets
FOR INSERT TO authenticated
WITH CHECK (
  get_my_app_role() IN ('admin', 'super_admin', 'security_supervisor', 'society_manager')
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS oversight_tickets_update ON public.oversight_tickets;
CREATE POLICY oversight_tickets_update ON public.oversight_tickets
FOR UPDATE TO authenticated
USING (
  get_my_app_role() IN ('admin', 'super_admin', 'security_supervisor', 'society_manager')
)
WITH CHECK (
  get_my_app_role() IN ('admin', 'super_admin', 'security_supervisor', 'society_manager')
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'oversight-ticket-evidence'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'oversight-ticket-evidence',
      'oversight-ticket-evidence',
      FALSE,
      10485760,
      ARRAY['image/jpeg', 'image/png', 'image/webp']
    );
  END IF;
END $$;

DROP POLICY IF EXISTS oversight_ticket_evidence_select ON storage.objects;
CREATE POLICY oversight_ticket_evidence_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'oversight-ticket-evidence'
  AND get_my_app_role() IN ('admin', 'super_admin', 'security_supervisor', 'society_manager')
);

DROP POLICY IF EXISTS oversight_ticket_evidence_insert ON storage.objects;
CREATE POLICY oversight_ticket_evidence_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'oversight-ticket-evidence'
  AND get_my_app_role() IN ('admin', 'super_admin', 'security_supervisor', 'society_manager')
);

DROP POLICY IF EXISTS oversight_ticket_evidence_delete ON storage.objects;
CREATE POLICY oversight_ticket_evidence_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'oversight-ticket-evidence'
  AND get_my_app_role() IN ('admin', 'super_admin', 'security_supervisor', 'society_manager')
);

CREATE OR REPLACE FUNCTION public.get_mobile_oversight_tickets()
RETURNS TABLE (
  id UUID,
  ticket_number TEXT,
  ticket_type TEXT,
  material_issue_type TEXT,
  subject_name TEXT,
  category TEXT,
  severity TEXT,
  status TEXT,
  note TEXT,
  evidence_urls JSONB,
  batch_number TEXT,
  ordered_quantity NUMERIC,
  received_quantity NUMERIC,
  shortage_quantity NUMERIC,
  return_quantity NUMERIC,
  location_name TEXT,
  source_visitor_id UUID,
  parent_ticket_id UUID,
  inspection_outcome TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ot.id,
    ot.ticket_number,
    ot.ticket_type,
    ot.material_issue_type,
    ot.subject_name,
    ot.category,
    ot.severity,
    ot.status,
    ot.note,
    ot.evidence_urls,
    ot.batch_number,
    ot.ordered_quantity,
    ot.received_quantity,
    ot.shortage_quantity,
    ot.return_quantity,
    ot.location_name,
    ot.source_visitor_id,
    ot.parent_ticket_id,
    ot.inspection_outcome,
    ot.created_at
  FROM public.oversight_tickets ot
  ORDER BY
    CASE ot.status
      WHEN 'open' THEN 0
      WHEN 'acknowledged' THEN 1
      ELSE 2
    END,
    ot.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_material_delivery_events()
RETURNS TABLE (
  id UUID,
  visitor_name TEXT,
  purpose TEXT,
  vehicle_number TEXT,
  photo_url TEXT,
  gate_name TEXT,
  entry_time TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id,
    v.visitor_name,
    COALESCE(v.purpose, 'Delivery inspection pending') AS purpose,
    v.vehicle_number,
    v.photo_url,
    COALESCE(cl.location_name, 'Gate') AS gate_name,
    v.entry_time
  FROM public.visitors v
  LEFT JOIN public.company_locations cl ON cl.id = v.entry_location_id
  WHERE COALESCE(v.visitor_type, 'guest') = 'delivery'
    AND v.exit_time IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.oversight_tickets ot
      WHERE ot.source_visitor_id = v.id
        AND ot.ticket_type = 'material'
    )
  ORDER BY v.entry_time DESC;
$$;

CREATE OR REPLACE FUNCTION public.create_behavior_ticket(
  p_subject_name TEXT,
  p_category TEXT,
  p_severity TEXT,
  p_note TEXT,
  p_evidence_urls JSONB DEFAULT '[]'::JSONB,
  p_location_name TEXT DEFAULT NULL,
  p_linked_employee_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.oversight_tickets%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR get_my_app_role() NOT IN ('admin', 'super_admin', 'security_supervisor', 'society_manager') THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Only oversight users can create behavior tickets');
  END IF;

  IF COALESCE(BTRIM(p_subject_name), '') = '' OR COALESCE(BTRIM(p_category), '') = '' OR COALESCE(BTRIM(p_note), '') = '' THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Subject, category, and note are required');
  END IF;

  INSERT INTO public.oversight_tickets (
    ticket_type,
    subject_name,
    category,
    severity,
    status,
    note,
    evidence_urls,
    location_name,
    linked_employee_id,
    created_by
  )
  VALUES (
    'behavior',
    BTRIM(p_subject_name),
    BTRIM(p_category),
    COALESCE(NULLIF(LOWER(BTRIM(p_severity)), ''), 'medium'),
    'open',
    BTRIM(p_note),
    COALESCE(p_evidence_urls, '[]'::JSONB),
    NULLIF(BTRIM(p_location_name), ''),
    p_linked_employee_id,
    auth.uid()
  )
  RETURNING * INTO v_ticket;

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'ticket_id', v_ticket.id,
    'ticket_number', v_ticket.ticket_number
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_material_ticket(
  p_subject_name TEXT,
  p_category TEXT,
  p_note TEXT,
  p_material_issue_type TEXT,
  p_severity TEXT DEFAULT 'medium',
  p_batch_number TEXT DEFAULT NULL,
  p_ordered_quantity NUMERIC DEFAULT NULL,
  p_received_quantity NUMERIC DEFAULT NULL,
  p_return_quantity NUMERIC DEFAULT NULL,
  p_evidence_urls JSONB DEFAULT '[]'::JSONB,
  p_location_name TEXT DEFAULT NULL,
  p_source_visitor_id UUID DEFAULT NULL,
  p_inspection_outcome TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.oversight_tickets%ROWTYPE;
  v_return_ticket public.oversight_tickets%ROWTYPE;
  v_material_issue_type TEXT := LOWER(COALESCE(NULLIF(BTRIM(p_material_issue_type), ''), 'quantity'));
  v_inspection_outcome TEXT := LOWER(COALESCE(NULLIF(BTRIM(p_inspection_outcome), ''), ''));
  v_status TEXT := 'open';
  v_ordered_quantity NUMERIC := CASE
    WHEN p_ordered_quantity IS NULL OR p_ordered_quantity < 0 THEN NULL
    ELSE p_ordered_quantity
  END;
  v_received_quantity NUMERIC := CASE
    WHEN p_received_quantity IS NULL OR p_received_quantity < 0 THEN NULL
    ELSE p_received_quantity
  END;
  v_shortage_quantity NUMERIC;
  v_return_quantity NUMERIC := CASE
    WHEN p_return_quantity IS NULL OR p_return_quantity < 0 THEN NULL
    ELSE p_return_quantity
  END;
BEGIN
  IF auth.uid() IS NULL OR get_my_app_role() NOT IN ('admin', 'super_admin', 'security_supervisor', 'society_manager') THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Only oversight users can create material tickets');
  END IF;

  IF COALESCE(BTRIM(p_subject_name), '') = '' OR COALESCE(BTRIM(p_category), '') = '' OR COALESCE(BTRIM(p_note), '') = '' THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Subject, category, and note are required');
  END IF;

  IF v_material_issue_type NOT IN ('quality', 'quantity') THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Material issue type must be quality or quantity');
  END IF;

  IF v_inspection_outcome <> '' AND v_inspection_outcome NOT IN ('approved', 'rejected') THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Inspection outcome must be approved or rejected');
  END IF;

  IF v_ordered_quantity IS NOT NULL AND v_received_quantity IS NOT NULL AND v_received_quantity > v_ordered_quantity THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Received quantity cannot exceed ordered quantity');
  END IF;

  v_shortage_quantity := CASE
    WHEN v_ordered_quantity IS NOT NULL AND v_received_quantity IS NOT NULL
      THEN GREATEST(v_ordered_quantity - v_received_quantity, 0)
    ELSE NULL
  END;

  IF v_inspection_outcome IN ('approved', 'rejected') THEN
    v_status := 'closed';
  END IF;

  IF v_inspection_outcome = 'rejected' AND v_return_quantity IS NULL THEN
    v_return_quantity := COALESCE(v_received_quantity, v_shortage_quantity, v_ordered_quantity, 0);
  END IF;

  INSERT INTO public.oversight_tickets (
    ticket_type,
    material_issue_type,
    source_visitor_id,
    subject_name,
    category,
    severity,
    status,
    note,
    evidence_urls,
    batch_number,
    ordered_quantity,
    received_quantity,
    shortage_quantity,
    return_quantity,
    inspection_outcome,
    location_name,
    acknowledged_at,
    acknowledged_by,
    resolved_at,
    resolved_by,
    resolution_notes,
    created_by
  )
  VALUES (
    'material',
    v_material_issue_type,
    p_source_visitor_id,
    BTRIM(p_subject_name),
    BTRIM(p_category),
    COALESCE(NULLIF(LOWER(BTRIM(p_severity)), ''), 'medium'),
    v_status,
    BTRIM(p_note),
    CASE
      WHEN COALESCE(JSONB_TYPEOF(p_evidence_urls), 'null') = 'array' THEN COALESCE(p_evidence_urls, '[]'::JSONB)
      ELSE '[]'::JSONB
    END,
    NULLIF(BTRIM(p_batch_number), ''),
    v_ordered_quantity,
    v_received_quantity,
    v_shortage_quantity,
    v_return_quantity,
    NULLIF(v_inspection_outcome, ''),
    NULLIF(BTRIM(p_location_name), ''),
    CASE WHEN v_status = 'closed' THEN NOW() ELSE NULL END,
    CASE WHEN v_status = 'closed' THEN auth.uid() ELSE NULL END,
    CASE WHEN v_status = 'closed' THEN NOW() ELSE NULL END,
    CASE WHEN v_status = 'closed' THEN auth.uid() ELSE NULL END,
    CASE
      WHEN v_inspection_outcome = 'approved' THEN 'Material inspection approved on mobile.'
      WHEN v_inspection_outcome = 'rejected' THEN 'Material inspection rejected and return follow-up created.'
      ELSE NULL
    END,
    auth.uid()
  )
  RETURNING * INTO v_ticket;

  IF v_inspection_outcome = 'rejected' THEN
    INSERT INTO public.oversight_tickets (
      ticket_type,
      material_issue_type,
      source_visitor_id,
      parent_ticket_id,
      subject_name,
      category,
      severity,
      status,
      note,
      evidence_urls,
      batch_number,
      ordered_quantity,
      received_quantity,
      shortage_quantity,
      return_quantity,
      location_name,
      created_by
    )
    VALUES (
      'return',
      v_material_issue_type,
      p_source_visitor_id,
      v_ticket.id,
      BTRIM(p_subject_name),
      'Return required',
      COALESCE(NULLIF(LOWER(BTRIM(p_severity)), ''), 'medium'),
      'open',
      COALESCE(NULLIF(BTRIM(p_note), ''), 'Return material follow-up required after rejected inspection.'),
      CASE
        WHEN COALESCE(JSONB_TYPEOF(p_evidence_urls), 'null') = 'array' THEN COALESCE(p_evidence_urls, '[]'::JSONB)
        ELSE '[]'::JSONB
      END,
      NULLIF(BTRIM(p_batch_number), ''),
      v_ordered_quantity,
      v_received_quantity,
      v_shortage_quantity,
      COALESCE(v_return_quantity, 0),
      NULLIF(BTRIM(p_location_name), ''),
      auth.uid()
    )
    RETURNING * INTO v_return_ticket;
  END IF;

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'ticket_id', v_ticket.id,
    'ticket_number', v_ticket.ticket_number,
    'return_ticket_id', v_return_ticket.id,
    'return_ticket_number', v_return_ticket.ticket_number
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_oversight_ticket_status(
  p_ticket_id UUID,
  p_status TEXT,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT := LOWER(COALESCE(NULLIF(BTRIM(p_status), ''), ''));
  v_ticket public.oversight_tickets%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR get_my_app_role() NOT IN ('admin', 'super_admin', 'security_supervisor', 'society_manager') THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Only oversight users can update tickets');
  END IF;

  IF p_ticket_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Ticket id is required');
  END IF;

  IF v_status NOT IN ('open', 'acknowledged', 'closed') THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Ticket status must be open, acknowledged, or closed');
  END IF;

  UPDATE public.oversight_tickets
  SET
    status = v_status,
    acknowledged_at = CASE
      WHEN v_status IN ('acknowledged', 'closed') THEN COALESCE(acknowledged_at, NOW())
      ELSE NULL
    END,
    acknowledged_by = CASE
      WHEN v_status IN ('acknowledged', 'closed') THEN COALESCE(acknowledged_by, auth.uid())
      ELSE NULL
    END,
    resolved_at = CASE
      WHEN v_status = 'closed' THEN COALESCE(resolved_at, NOW())
      ELSE NULL
    END,
    resolved_by = CASE
      WHEN v_status = 'closed' THEN COALESCE(resolved_by, auth.uid())
      ELSE NULL
    END,
    resolution_notes = CASE
      WHEN v_status = 'closed' THEN NULLIF(BTRIM(p_resolution_notes), '')
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;

  IF v_ticket.id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Ticket not found');
  END IF;

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'ticket_id', v_ticket.id,
    'ticket_number', v_ticket.ticket_number,
    'status', v_ticket.status
  );
END;
$$;

GRANT SELECT, INSERT, UPDATE ON public.oversight_tickets TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.oversight_ticket_seq TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mobile_oversight_tickets() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_material_delivery_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_behavior_ticket(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_material_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, JSONB, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_oversight_ticket_status(UUID, TEXT, TEXT) TO authenticated;
