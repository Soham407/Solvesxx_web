-- =============================================================================
-- Security Ops mobile contracts
-- Checklist overrides, panic streaming/status RPCs, visitor timeout persistence,
-- delivery-at-gate fanout, emergency contacts, and live oversight attendance.
-- =============================================================================

ALTER TABLE public.checklist_responses
  ADD COLUMN IF NOT EXISTS override_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS overridden_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS overridden_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'checklist_responses_override_status_check'
  ) THEN
    ALTER TABLE public.checklist_responses
      ADD CONSTRAINT checklist_responses_override_status_check
      CHECK (override_status IN ('none', 'approved', 'resubmitted'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.checklist_response_override_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.checklist_responses(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  guard_id UUID REFERENCES public.security_guards(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  reason TEXT,
  acted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_responses_override_status
  ON public.checklist_responses(employee_id, response_date, override_status);

CREATE INDEX IF NOT EXISTS idx_checklist_response_override_audit_response
  ON public.checklist_response_override_audit(response_id, acted_at DESC);

CREATE OR REPLACE FUNCTION public.reopen_guard_checklist(
  p_guard_id UUID,
  p_reason TEXT,
  p_checklist_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_response RECORD;
  v_reopened_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    has_role('security_supervisor')
    OR has_role('society_manager')
    OR has_role('admin')
    OR has_role('super_admin')
  ) THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Only oversight users can reopen submitted checklists');
  END IF;

  IF p_guard_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Guard ID is required');
  END IF;

  IF COALESCE(BTRIM(p_reason), '') = '' THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Override reason is required');
  END IF;

  FOR v_response IN
    UPDATE public.checklist_responses cr
    SET
      override_status = 'approved',
      override_reason = BTRIM(p_reason),
      overridden_by = auth.uid(),
      overridden_at = NOW()
    FROM public.security_guards sg
    WHERE sg.id = p_guard_id
      AND cr.employee_id = sg.employee_id
      AND cr.response_date = CURRENT_DATE
      AND (p_checklist_id IS NULL OR cr.checklist_id = p_checklist_id)
    RETURNING cr.id, cr.checklist_id, cr.employee_id
  LOOP
    INSERT INTO public.checklist_response_override_audit (
      response_id,
      checklist_id,
      employee_id,
      guard_id,
      status,
      reason,
      acted_by
    )
    VALUES (
      v_response.id,
      v_response.checklist_id,
      v_response.employee_id,
      p_guard_id,
      'approved',
      BTRIM(p_reason),
      auth.uid()
    );

    v_reopened_count := v_reopened_count + 1;
  END LOOP;

  IF v_reopened_count = 0 THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'No submitted checklist was found for this guard today');
  END IF;

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'guard_id', p_guard_id,
    'reopened_count', v_reopened_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_mobile_guard_checklist(
  p_checklist_id UUID,
  p_responses JSONB,
  p_is_complete BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
  v_guard_id UUID;
  v_response_id UUID;
  v_existing_response public.checklist_responses%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF auth.uid() IS NULL OR NOT is_guard() THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE,
      'error', 'Only authenticated guards can submit checklists'
    );
  END IF;

  IF p_checklist_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE,
      'error', 'Checklist ID is required'
    );
  END IF;

  IF JSONB_TYPEOF(COALESCE(p_responses, '[]'::JSONB)) IS DISTINCT FROM 'array' THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE,
      'error', 'Checklist responses must be a JSON array'
    );
  END IF;

  v_employee_id := get_employee_id();
  v_guard_id := get_guard_id();

  IF v_employee_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE,
      'error', 'Guard profile is not fully configured'
    );
  END IF;

  SELECT *
  INTO v_existing_response
  FROM public.checklist_responses cr
  WHERE cr.employee_id = v_employee_id
    AND cr.checklist_id = p_checklist_id
    AND cr.response_date = CURRENT_DATE
  LIMIT 1;

  IF FOUND AND COALESCE(v_existing_response.override_status, 'none') NOT IN ('approved', 'none') THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE,
      'error', 'Checklist is locked and requires a fresh supervisor override before resubmission'
    );
  END IF;

  IF FOUND AND COALESCE(v_existing_response.override_status, 'none') = 'none' THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE,
      'error', 'Checklist is already locked for today. Ask a supervisor to reopen it first.'
    );
  END IF;

  INSERT INTO public.checklist_responses (
    employee_id,
    checklist_id,
    response_date,
    submitted_at,
    responses,
    is_complete,
    override_status
  )
  VALUES (
    v_employee_id,
    p_checklist_id,
    CURRENT_DATE,
    v_now,
    COALESCE(p_responses, '[]'::JSONB),
    COALESCE(p_is_complete, TRUE),
    'none'
  )
  ON CONFLICT (checklist_id, employee_id, response_date)
  DO UPDATE SET
    submitted_at = EXCLUDED.submitted_at,
    responses = EXCLUDED.responses,
    is_complete = EXCLUDED.is_complete,
    override_status = CASE
      WHEN public.checklist_responses.override_status = 'approved' THEN 'resubmitted'
      ELSE public.checklist_responses.override_status
    END
  RETURNING id INTO v_response_id;

  IF FOUND AND COALESCE(v_existing_response.override_status, 'none') = 'approved' THEN
    INSERT INTO public.checklist_response_override_audit (
      response_id,
      checklist_id,
      employee_id,
      guard_id,
      status,
      reason,
      acted_by
    )
    VALUES (
      v_response_id,
      p_checklist_id,
      v_employee_id,
      v_guard_id,
      'resubmitted',
      v_existing_response.override_reason,
      auth.uid()
    );
  END IF;

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'response_id', v_response_id,
    'submitted_at', v_now
  );
END;
$$;

DROP FUNCTION IF EXISTS public.get_guard_checklist_items();
CREATE FUNCTION public.get_guard_checklist_items()
RETURNS TABLE (
  master_item_id UUID,
  checklist_id UUID,
  title TEXT,
  description TEXT,
  required_evidence BOOLEAN,
  input_type TEXT,
  numeric_unit_label TEXT,
  numeric_min_value NUMERIC,
  numeric_max_value NUMERIC,
  requires_supervisor_override BOOLEAN,
  response_value TEXT,
  evidence_url TEXT,
  status TEXT,
  submitted_at TIMESTAMPTZ,
  override_status TEXT,
  override_reason TEXT,
  overridden_at TIMESTAMPTZ,
  overridden_by_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest_response AS (
    SELECT DISTINCT ON (cr.employee_id, cr.checklist_id)
      cr.employee_id,
      cr.checklist_id,
      cr.responses,
      cr.submitted_at,
      cr.override_status,
      cr.override_reason,
      cr.overridden_at,
      cr.overridden_by
    FROM public.checklist_responses cr
    WHERE cr.employee_id = get_employee_id()
      AND cr.response_date = CURRENT_DATE
    ORDER BY cr.employee_id, cr.checklist_id, cr.submitted_at DESC
  )
  SELECT
    dci.id AS master_item_id,
    dci.checklist_id,
    dci.task_name AS title,
    dci.description,
    dci.requires_photo AS required_evidence,
    dci.input_type,
    dci.numeric_unit_label,
    dci.numeric_min_value,
    dci.numeric_max_value,
    dci.requires_supervisor_override,
    response_item.value ->> 'value' AS response_value,
    response_item.value ->> 'evidence_url' AS evidence_url,
    CASE
      WHEN response_item.value IS NULL THEN 'pending'
      ELSE 'completed'
    END AS status,
    lr.submitted_at,
    COALESCE(lr.override_status, 'none') AS override_status,
    lr.override_reason,
    lr.overridden_at,
    acting_user.full_name AS overridden_by_name
  FROM public.daily_checklist_items dci
  LEFT JOIN latest_response lr ON lr.checklist_id = dci.checklist_id
  LEFT JOIN public.users acting_user ON acting_user.id = lr.overridden_by
  LEFT JOIN LATERAL (
    SELECT item.value
    FROM JSONB_ARRAY_ELEMENTS(COALESCE(lr.responses, '[]'::JSONB)) AS item(value)
    WHERE item.value ->> 'master_item_id' = dci.id::TEXT
    LIMIT 1
  ) response_item ON TRUE
  WHERE dci.is_active = TRUE
  ORDER BY dci.priority, dci.created_at;
$$;

CREATE OR REPLACE FUNCTION public.update_panic_alert_location(
  p_alert_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_captured_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT is_guard() THEN
    RETURN FALSE;
  END IF;

  UPDATE public.panic_alerts
  SET
    latitude = p_latitude,
    longitude = p_longitude,
    streaming_active = TRUE,
    metadata = jsonb_set(
      jsonb_set(COALESCE(metadata, '{}'::JSONB), '{last_streamed_at}', to_jsonb(COALESCE(p_captured_at, NOW())), TRUE),
      '{stream_source}',
      to_jsonb('mobile_guard'::TEXT),
      TRUE
    )
  WHERE id = p_alert_id
    AND guard_id = get_guard_id()
    AND is_resolved = FALSE;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_panic_alert_status(
  p_alert_id UUID
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN pa.is_resolved THEN 'resolved'
    WHEN pa.acknowledged_at IS NOT NULL THEN 'acknowledged'
    ELSE 'active'
  END
  FROM public.panic_alerts pa
  WHERE pa.id = p_alert_id
    AND (
      pa.guard_id = get_guard_id()
      OR has_role('security_supervisor')
      OR has_role('society_manager')
      OR has_role('admin')
      OR has_role('super_admin')
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.resolve_mobile_panic_alert(
  p_alert_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guard_user_id UUID;
  v_resolver_employee_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    has_role('security_supervisor')
    OR has_role('society_manager')
    OR has_role('admin')
    OR has_role('super_admin')
  ) THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Only oversight users can resolve alerts');
  END IF;

  v_resolver_employee_id := get_employee_id();

  IF v_resolver_employee_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Resolver employee profile is missing');
  END IF;

  UPDATE public.panic_alerts
  SET
    is_resolved = TRUE,
    resolved_at = NOW(),
    resolved_by = v_resolver_employee_id,
    resolution_notes = NULLIF(p_notes, ''),
    streaming_active = FALSE
  WHERE id = p_alert_id
    AND is_resolved = FALSE;

  IF NOT FOUND THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Alert not found or already resolved');
  END IF;

  SELECT e.auth_user_id
  INTO v_guard_user_id
  FROM public.panic_alerts pa
  JOIN public.security_guards sg ON sg.id = pa.guard_id
  JOIN public.employees e ON e.id = sg.employee_id
  WHERE pa.id = p_alert_id
  LIMIT 1;

  IF v_guard_user_id IS NOT NULL THEN
    PERFORM public.mobile_insert_notification(
      v_guard_user_id,
      'SOS resolved',
      'Your panic alert has been resolved by the control room.',
      'panic_resolved',
      'high',
      '/guard/home',
      JSONB_BUILD_OBJECT('alert_id', p_alert_id),
      'push_queued',
      'queued',
      NOW() + INTERVAL '60 seconds'
    );
  END IF;

  RETURN JSONB_BUILD_OBJECT('success', TRUE, 'alert_id', p_alert_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_mobile_visitor_decisions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INTEGER := 0;
BEGIN
  UPDATE public.visitors
  SET
    approval_status = 'timed_out',
    decision_at = COALESCE(decision_at, NOW()),
    rejection_reason = COALESCE(NULLIF(rejection_reason, ''), 'Resident approval window expired.')
  WHERE exit_time IS NULL
    AND approval_status = 'pending'
    AND approval_deadline_at IS NOT NULL
    AND approval_deadline_at < NOW();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RETURN COALESCE(v_expired_count, 0);
END;
$$;

DROP FUNCTION IF EXISTS public.create_mobile_visitor(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN);
CREATE FUNCTION public.create_mobile_visitor(
  p_visitor_name TEXT,
  p_phone TEXT,
  p_purpose TEXT,
  p_flat_id UUID,
  p_vehicle_number TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL,
  p_is_frequent_visitor BOOLEAN DEFAULT FALSE,
  p_visitor_type TEXT DEFAULT 'guest'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guard_id UUID;
  v_guard_location_id UUID;
  v_primary_resident_id UUID;
  v_auto_approve BOOLEAN := FALSE;
  v_visitor_id UUID;
  v_recipient RECORD;
  v_visitor_type TEXT := LOWER(COALESCE(NULLIF(BTRIM(p_visitor_type), ''), 'guest'));
  v_guard_name TEXT;
  v_gate_name TEXT;
  v_requires_resident_approval BOOLEAN := TRUE;
BEGIN
  IF auth.uid() IS NULL OR NOT is_guard() THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Only authenticated guards can create visitors');
  END IF;

  IF COALESCE(BTRIM(p_visitor_name), '') = '' THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Visitor name is required');
  END IF;

  IF v_visitor_type = 'delivery' THEN
    v_requires_resident_approval := FALSE;
  ELSIF p_flat_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Destination flat is required for resident-bound visitors');
  END IF;

  SELECT
    sg.id,
    sg.assigned_location_id,
    TRIM(COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')),
    COALESCE(cl.location_name, 'Gate')
  INTO
    v_guard_id,
    v_guard_location_id,
    v_guard_name,
    v_gate_name
  FROM public.security_guards sg
  JOIN public.employees e ON e.id = sg.employee_id
  LEFT JOIN public.company_locations cl ON cl.id = sg.assigned_location_id
  WHERE e.auth_user_id = auth.uid()
  LIMIT 1;

  IF p_flat_id IS NOT NULL THEN
    SELECT r.id
    INTO v_primary_resident_id
    FROM public.residents r
    WHERE r.flat_id = p_flat_id
      AND r.is_active = TRUE
    ORDER BY r.is_primary_contact DESC, r.created_at
    LIMIT 1;
  END IF;

  IF v_requires_resident_approval AND p_is_frequent_visitor THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.visitors v
      WHERE
        v.flat_id = p_flat_id
        AND COALESCE(v.phone, '') = COALESCE(p_phone, '')
        AND v.is_frequent_visitor = TRUE
        AND v.approved_by_resident = TRUE
    )
    INTO v_auto_approve;
  END IF;

  INSERT INTO public.visitors (
    visitor_name,
    visitor_type,
    phone,
    vehicle_number,
    photo_url,
    flat_id,
    resident_id,
    purpose,
    entry_guard_id,
    entry_location_id,
    approved_by_resident,
    is_frequent_visitor,
    approval_status,
    approval_deadline_at,
    decision_at,
    notification_sent_at
  )
  VALUES (
    p_visitor_name,
    v_visitor_type,
    NULLIF(p_phone, ''),
    NULLIF(p_vehicle_number, ''),
    NULLIF(p_photo_url, ''),
    p_flat_id,
    v_primary_resident_id,
    NULLIF(p_purpose, ''),
    v_guard_id,
    v_guard_location_id,
    CASE
      WHEN v_requires_resident_approval THEN v_auto_approve
      ELSE FALSE
    END,
    CASE
      WHEN v_requires_resident_approval THEN p_is_frequent_visitor
      ELSE FALSE
    END,
    CASE
      WHEN v_requires_resident_approval THEN CASE WHEN v_auto_approve THEN 'approved' ELSE 'pending' END
      ELSE 'approved'
    END,
    CASE
      WHEN v_requires_resident_approval AND NOT v_auto_approve THEN NOW() + INTERVAL '30 seconds'
      ELSE NULL
    END,
    CASE
      WHEN v_requires_resident_approval AND NOT v_auto_approve THEN NULL
      ELSE NOW()
    END,
    NOW()
  )
  RETURNING id INTO v_visitor_id;

  IF v_requires_resident_approval AND NOT v_auto_approve THEN
    FOR v_recipient IN
      SELECT r.auth_user_id AS user_id
      FROM public.residents r
      WHERE r.flat_id = p_flat_id
        AND r.is_active = TRUE
        AND r.auth_user_id IS NOT NULL
    LOOP
      PERFORM public.mobile_insert_notification(
        v_recipient.user_id,
        'Visitor at gate',
        p_visitor_name || ' is waiting at ' || v_gate_name || ' for your approval.',
        'visitor_at_gate',
        'high',
        '/resident/approvals',
        JSONB_BUILD_OBJECT(
          'visitor_id', v_visitor_id,
          'flat_id', p_flat_id,
          'visitor_name', p_visitor_name,
          'vehicle_number', NULLIF(p_vehicle_number, ''),
          'purpose', NULLIF(p_purpose, ''),
          'gate_name', v_gate_name,
          'visitor_photo_url', NULLIF(p_photo_url, ''),
          'approval_deadline_at', NOW() + INTERVAL '30 seconds'
        ),
        'push_queued',
        'queued',
        NOW() + INTERVAL '60 seconds'
      );
    END LOOP;
  ELSIF v_visitor_type = 'delivery' THEN
    FOR v_recipient IN
      SELECT u.id
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE
        u.is_active = TRUE
        AND r.role_name::TEXT IN ('security_supervisor', 'society_manager', 'admin', 'super_admin')
    LOOP
      PERFORM public.mobile_insert_notification(
        v_recipient.id,
        'Material delivery logged',
        p_visitor_name || ' has been logged as a delivery vehicle at ' || v_gate_name || '.',
        'material_delivery',
        'high',
        '/oversight/tickets',
        JSONB_BUILD_OBJECT(
          'visitor_id', v_visitor_id,
          'visitor_name', p_visitor_name,
          'vehicle_number', NULLIF(p_vehicle_number, ''),
          'purpose', NULLIF(p_purpose, ''),
          'gate_name', v_gate_name,
          'guard_name', v_guard_name,
          'visitor_photo_url', NULLIF(p_photo_url, '')
        ),
        'push_queued',
        'not_applicable',
        NULL
      );
    END LOOP;
  END IF;

  RETURN (
    SELECT JSONB_BUILD_OBJECT(
      'success', TRUE,
      'visitor_id', v.id,
      'visitor', TO_JSONB(v)
    )
    FROM public.visitors v
    WHERE v.id = v_visitor_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_visitor(
  p_visitor_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor RECORD;
  v_is_resident BOOLEAN;
  v_resident_flat_id UUID;
BEGIN
  PERFORM public.expire_mobile_visitor_decisions();

  IF auth.uid() IS NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Authentication required');
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Authenticated user mismatch');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.residents WHERE auth_user_id = p_user_id
  ) INTO v_is_resident;

  IF NOT v_is_resident THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Only residents can approve visitors');
  END IF;

  SELECT flat_id INTO v_resident_flat_id
  FROM public.residents
  WHERE auth_user_id = p_user_id
  LIMIT 1;

  SELECT * INTO v_visitor
  FROM public.visitors
  WHERE id = p_visitor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Visitor not found');
  END IF;

  IF v_visitor.flat_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Visitors without a destination flat cannot be approved');
  END IF;

  IF v_visitor.flat_id != v_resident_flat_id THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'You can only approve visitors for your own flat');
  END IF;

  IF v_visitor.exit_time IS NOT NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Cannot approve a visitor who has already checked out');
  END IF;

  IF v_visitor.approval_status = 'timed_out' THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'The visitor approval window has already expired');
  END IF;

  UPDATE public.visitors
  SET
    approved_by_resident = TRUE,
    approval_status = 'approved',
    decision_at = NOW(),
    rejection_reason = NULL
  WHERE id = p_visitor_id;

  RETURN JSONB_BUILD_OBJECT('success', TRUE, 'visitor_id', p_visitor_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.deny_visitor(
  p_visitor_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor RECORD;
  v_is_resident BOOLEAN;
  v_resident_flat_id UUID;
BEGIN
  PERFORM public.expire_mobile_visitor_decisions();

  IF auth.uid() IS NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Authentication required');
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Authenticated user mismatch');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.residents WHERE auth_user_id = p_user_id
  ) INTO v_is_resident;

  IF NOT v_is_resident THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Only residents can deny visitors');
  END IF;

  SELECT flat_id INTO v_resident_flat_id
  FROM public.residents
  WHERE auth_user_id = p_user_id
  LIMIT 1;

  SELECT * INTO v_visitor
  FROM public.visitors
  WHERE id = p_visitor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Visitor not found');
  END IF;

  IF v_visitor.flat_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Visitors without a destination flat cannot be denied');
  END IF;

  IF v_visitor.flat_id != v_resident_flat_id THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'You can only deny visitors for your own flat');
  END IF;

  IF v_visitor.exit_time IS NOT NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Cannot deny a visitor who has already checked out');
  END IF;

  IF v_visitor.approval_status = 'timed_out' THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'The visitor approval window has already expired');
  END IF;

  UPDATE public.visitors
  SET
    approved_by_resident = FALSE,
    approval_status = 'denied',
    decision_at = NOW(),
    rejection_reason = COALESCE(NULLIF(BTRIM(p_reason), ''), 'Declined by resident')
  WHERE id = p_visitor_id;

  RETURN JSONB_BUILD_OBJECT('success', TRUE, 'visitor_id', p_visitor_id);
END;
$$;

DROP FUNCTION IF EXISTS public.get_guard_visitors(BOOLEAN);
CREATE FUNCTION public.get_guard_visitors(
  p_include_checked_out BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id UUID,
  visitor_name TEXT,
  visitor_type TEXT,
  phone TEXT,
  purpose TEXT,
  flat_id UUID,
  flat_label TEXT,
  resident_id UUID,
  resident_name TEXT,
  vehicle_number TEXT,
  photo_url TEXT,
  entry_time TIMESTAMPTZ,
  exit_time TIMESTAMPTZ,
  entry_location_name TEXT,
  is_frequent_visitor BOOLEAN,
  approval_status TEXT,
  approval_deadline_at TIMESTAMPTZ,
  decision_at TIMESTAMPTZ,
  approved_by_resident BOOLEAN,
  rejection_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.expire_mobile_visitor_decisions();

  RETURN QUERY
  SELECT
    v.id,
    v.visitor_name,
    COALESCE(v.visitor_type, 'guest') AS visitor_type,
    v.phone,
    v.purpose,
    v.flat_id,
    TRIM(COALESCE(b.building_name || ' - ', '') || COALESCE(f.flat_number, 'Visitor destination')) AS flat_label,
    v.resident_id,
    r.full_name AS resident_name,
    v.vehicle_number,
    v.photo_url,
    v.entry_time,
    v.exit_time,
    COALESCE(cl.location_name, 'Gate') AS entry_location_name,
    v.is_frequent_visitor,
    v.approval_status,
    v.approval_deadline_at,
    v.decision_at,
    v.approved_by_resident,
    v.rejection_reason
  FROM public.visitors v
  LEFT JOIN public.flats f ON f.id = v.flat_id
  LEFT JOIN public.buildings b ON b.id = f.building_id
  LEFT JOIN public.residents r ON r.id = v.resident_id
  LEFT JOIN public.company_locations cl ON cl.id = v.entry_location_id
  WHERE
    v.entry_guard_id = get_guard_id()
    AND (p_include_checked_out OR v.exit_time IS NULL)
  ORDER BY v.entry_time DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_resident_pending_visitors()
RETURNS TABLE (
  id UUID,
  visitor_name TEXT,
  phone TEXT,
  purpose TEXT,
  flat_id UUID,
  flat_label TEXT,
  vehicle_number TEXT,
  photo_url TEXT,
  entry_time TIMESTAMPTZ,
  approval_status TEXT,
  approval_deadline_at TIMESTAMPTZ,
  is_frequent_visitor BOOLEAN,
  rejection_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.expire_mobile_visitor_decisions();

  RETURN QUERY
  SELECT
    v.id,
    v.visitor_name,
    v.phone,
    v.purpose,
    v.flat_id,
    TRIM(COALESCE(b.building_name || ' - ', '') || COALESCE(f.flat_number, 'Visitor destination')) AS flat_label,
    v.vehicle_number,
    v.photo_url,
    v.entry_time,
    v.approval_status,
    v.approval_deadline_at,
    v.is_frequent_visitor,
    v.rejection_reason
  FROM public.visitors v
  JOIN public.residents r
    ON r.flat_id = v.flat_id
   AND r.auth_user_id = auth.uid()
  LEFT JOIN public.flats f ON f.id = v.flat_id
  LEFT JOIN public.buildings b ON b.id = f.building_id
  WHERE v.exit_time IS NULL
  ORDER BY v.entry_time DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_oversight_visitor_stats()
RETURNS TABLE (
  id UUID,
  gate_name TEXT,
  visitors_today BIGINT,
  visitors_this_week BIGINT,
  pending_approvals BIGINT,
  delivery_vehicles BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.expire_mobile_visitor_decisions();

  RETURN QUERY
  SELECT
    cl.id,
    cl.location_name AS gate_name,
    COUNT(*) FILTER (WHERE v.entry_time::DATE = CURRENT_DATE)::BIGINT AS visitors_today,
    COUNT(*) FILTER (WHERE v.entry_time >= DATE_TRUNC('week', NOW()))::BIGINT AS visitors_this_week,
    COUNT(*) FILTER (
      WHERE v.exit_time IS NULL
        AND v.approval_status = 'pending'
    )::BIGINT AS pending_approvals,
    COUNT(*) FILTER (
      WHERE COALESCE(v.visitor_type, 'guest') = 'delivery'
    )::BIGINT AS delivery_vehicles
  FROM public.company_locations cl
  LEFT JOIN public.visitors v ON v.entry_location_id = cl.id
  GROUP BY cl.id, cl.location_name
  ORDER BY cl.location_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_guard_emergency_contacts()
RETURNS TABLE (
  id TEXT,
  label TEXT,
  role TEXT,
  phone TEXT,
  description TEXT,
  is_primary BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH staff_contacts AS (
    SELECT
      'user-' || u.id::TEXT AS id,
      COALESCE(NULLIF(BTRIM(u.full_name), ''), 'Operations contact') AS label,
      INITCAP(REPLACE(r.role_name::TEXT, '_', ' ')) AS role,
      COALESCE(NULLIF(BTRIM(u.phone), ''), NULLIF(BTRIM(e.phone), '')) AS phone,
      'App-configured escalation contact' AS description,
      (r.role_name::TEXT = 'security_supervisor') AS is_primary,
      0 AS sort_order
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    LEFT JOIN public.employees e ON e.id = u.employee_id
    WHERE
      u.is_active = TRUE
      AND r.role_name::TEXT IN ('security_supervisor', 'society_manager', 'admin')
      AND COALESCE(NULLIF(BTRIM(u.phone), ''), NULLIF(BTRIM(e.phone), '')) IS NOT NULL
  ),
  directory_contacts AS (
    SELECT
      'emergency-' || ec.id::TEXT AS id,
      ec.contact_name AS label,
      INITCAP(REPLACE(ec.contact_type, '_', ' ')) AS role,
      ec.phone_number AS phone,
      COALESCE(ec.description, 'Manager-configured emergency contact') AS description,
      (COALESCE(ec.priority, 99) = 1) AS is_primary,
      COALESCE(ec.priority, 99) AS sort_order
    FROM public.emergency_contacts ec
    WHERE ec.is_active = TRUE
      AND COALESCE(BTRIM(ec.phone_number), '') <> ''
  )
  SELECT
    contact.id,
    contact.label,
    contact.role,
    contact.phone,
    contact.description,
    contact.is_primary
  FROM (
    SELECT * FROM staff_contacts
    UNION ALL
    SELECT * FROM directory_contacts
  ) AS contact
  ORDER BY contact.is_primary DESC, contact.sort_order, contact.label;
$$;

CREATE OR REPLACE FUNCTION public.get_oversight_attendance_log()
RETURNS TABLE (
  id UUID,
  employee_name TEXT,
  role_label TEXT,
  location_name TEXT,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  geo_status TEXT,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH guard_map AS (
    SELECT
      sg.id AS guard_id,
      sg.employee_id,
      sg.assigned_location_id
    FROM public.security_guards sg
  ),
  latest_gps AS (
    SELECT DISTINCT ON (gt.employee_id)
      gt.employee_id,
      gt.latitude,
      gt.longitude,
      gt.tracked_at
    FROM public.gps_tracking gt
    ORDER BY gt.employee_id, gt.tracked_at DESC
  )
  SELECT
    al.id,
    TRIM(COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')) AS employee_name,
    COALESCE(INITCAP(REPLACE(r.role_name::TEXT, '_', ' ')), 'Employee') AS role_label,
    COALESCE(cl.location_name, 'Location pending') AS location_name,
    al.check_in_time AS check_in_at,
    al.check_out_time AS check_out_at,
    CASE
      WHEN
        lg.tracked_at IS NOT NULL
        AND site.latitude IS NOT NULL
        AND site.longitude IS NOT NULL
        AND check_geofence(
          lg.latitude::DOUBLE PRECISION,
          lg.longitude::DOUBLE PRECISION,
          site.latitude::DOUBLE PRECISION,
          site.longitude::DOUBLE PRECISION,
          COALESCE(site.geo_fence_radius::DOUBLE PRECISION, 100.0)
        ) THEN 'verified'
      WHEN
        lg.tracked_at IS NOT NULL
        AND site.latitude IS NOT NULL
        AND site.longitude IS NOT NULL THEN 'outside_fence'
      WHEN al.check_in_location_id IS NOT NULL THEN 'verified'
      ELSE 'missing'
    END AS geo_status,
    CASE
      WHEN al.check_in_time IS NULL THEN 'absent'
      WHEN al.check_out_time IS NULL THEN 'on_shift'
      ELSE 'completed'
    END AS status
  FROM public.attendance_logs al
  JOIN public.employees e ON e.id = al.employee_id
  LEFT JOIN public.users u ON u.id = e.auth_user_id
  LEFT JOIN public.roles r ON r.id = u.role_id
  LEFT JOIN public.company_locations cl
    ON cl.id = COALESCE(al.check_in_location_id, al.check_out_location_id)
  LEFT JOIN guard_map gm ON gm.employee_id = al.employee_id
  LEFT JOIN public.company_locations site ON site.id = gm.assigned_location_id
  LEFT JOIN latest_gps lg ON lg.employee_id = gm.guard_id
  WHERE al.log_date >= CURRENT_DATE - INTERVAL '1 day'
  ORDER BY COALESCE(al.check_in_time, al.created_at) DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.reopen_guard_checklist(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_mobile_guard_checklist(UUID, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_guard_checklist_items() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_panic_alert_location(UUID, NUMERIC, NUMERIC, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_panic_alert_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_mobile_panic_alert(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_mobile_visitor_decisions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_mobile_visitor(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_visitor(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deny_visitor(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_guard_visitors(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_resident_pending_visitors() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_oversight_visitor_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_guard_emergency_contacts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_oversight_attendance_log() TO authenticated;
