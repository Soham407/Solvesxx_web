UPDATE public.visitors
SET approved_by_resident = NULL
WHERE approval_status = 'pending'
  AND approved_by_resident = FALSE
  AND COALESCE(NULLIF(BTRIM(rejection_reason), ''), '') = '';

CREATE OR REPLACE FUNCTION public.create_mobile_visitor(
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
      WHEN v_requires_resident_approval THEN CASE WHEN v_auto_approve THEN TRUE ELSE NULL END
      ELSE TRUE
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

CREATE OR REPLACE FUNCTION public.check_visitor_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_guard() AND NOT is_admin() THEN
    IF OLD.flat_id IS DISTINCT FROM NEW.flat_id
       OR OLD.visitor_name IS DISTINCT FROM NEW.visitor_name
       OR OLD.approved_by_resident IS DISTINCT FROM NEW.approved_by_resident
       OR OLD.resident_id IS DISTINCT FROM NEW.resident_id
       OR OLD.visitor_type IS DISTINCT FROM NEW.visitor_type
       OR OLD.is_frequent_visitor IS DISTINCT FROM NEW.is_frequent_visitor
       OR OLD.bypass_reason IS DISTINCT FROM NEW.bypass_reason THEN
      RAISE EXCEPTION 'Security Policy: Guards cannot modify visitor approval or identity fields.';
    END IF;
  ELSIF is_resident() AND NOT is_admin() THEN
    IF OLD.flat_id IS DISTINCT FROM NEW.flat_id
       OR OLD.visitor_name IS DISTINCT FROM NEW.visitor_name
       OR OLD.resident_id IS DISTINCT FROM NEW.resident_id
       OR OLD.visitor_type IS DISTINCT FROM NEW.visitor_type
       OR OLD.phone IS DISTINCT FROM NEW.phone
       OR OLD.vehicle_number IS DISTINCT FROM NEW.vehicle_number
       OR OLD.photo_url IS DISTINCT FROM NEW.photo_url
       OR OLD.purpose IS DISTINCT FROM NEW.purpose
       OR OLD.entry_time IS DISTINCT FROM NEW.entry_time
       OR OLD.exit_time IS DISTINCT FROM NEW.exit_time
       OR OLD.entry_guard_id IS DISTINCT FROM NEW.entry_guard_id
       OR OLD.exit_guard_id IS DISTINCT FROM NEW.exit_guard_id
       OR OLD.entry_location_id IS DISTINCT FROM NEW.entry_location_id
       OR OLD.bypass_reason IS DISTINCT FROM NEW.bypass_reason
       OR OLD.visitor_pass_number IS DISTINCT FROM NEW.visitor_pass_number THEN
      RAISE EXCEPTION 'Security Policy: Residents can only approve, deny, or change frequent visitor status from the app.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_mobile_visitor(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
