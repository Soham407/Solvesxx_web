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
  p_is_frequent_visitor BOOLEAN DEFAULT FALSE
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
BEGIN
  IF auth.uid() IS NULL OR NOT is_guard() THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Only authenticated guards can create visitors');
  END IF;

  IF COALESCE(BTRIM(p_visitor_name), '') = '' OR p_flat_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Visitor name and destination flat are required');
  END IF;

  SELECT
    sg.id,
    sg.assigned_location_id
  INTO
    v_guard_id,
    v_guard_location_id
  FROM public.security_guards sg
  JOIN public.employees e ON e.id = sg.employee_id
  WHERE e.auth_user_id = auth.uid()
  LIMIT 1;

  SELECT r.id
  INTO v_primary_resident_id
  FROM public.residents r
  WHERE r.flat_id = p_flat_id
    AND r.is_active = TRUE
  ORDER BY r.is_primary_contact DESC, r.created_at
  LIMIT 1;

  IF p_is_frequent_visitor THEN
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
    notification_sent_at
  )
  VALUES (
    p_visitor_name,
    'guest',
    NULLIF(p_phone, ''),
    NULLIF(p_vehicle_number, ''),
    NULLIF(p_photo_url, ''),
    p_flat_id,
    v_primary_resident_id,
    NULLIF(p_purpose, ''),
    v_guard_id,
    v_guard_location_id,
    CASE WHEN v_auto_approve THEN TRUE ELSE NULL END,
    p_is_frequent_visitor,
    CASE WHEN v_auto_approve THEN 'approved' ELSE 'pending' END,
    CASE WHEN v_auto_approve THEN NULL ELSE NOW() + INTERVAL '30 seconds' END,
    NOW()
  )
  RETURNING id INTO v_visitor_id;

  IF NOT v_auto_approve THEN
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
        p_visitor_name || ' is waiting for approval at the gate.',
        'visitor_at_gate',
        'high',
        '/resident/approvals',
        JSONB_BUILD_OBJECT(
          'visitor_id', v_visitor_id,
          'flat_id', p_flat_id
        ),
        'push_queued',
        'queued',
        NOW() + INTERVAL '60 seconds'
      );
    END LOOP;
  END IF;

  RETURN (
    SELECT JSONB_BUILD_OBJECT(
      'success', TRUE,
      'visitor', TO_JSONB(v)
    )
    FROM public.visitors v
    WHERE v.id = v_visitor_id
  );
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
    v.visitor_name::TEXT,
    v.phone::TEXT,
    v.purpose::TEXT,
    v.flat_id,
    TRIM(COALESCE(b.building_name || ' - ', '') || COALESCE(f.flat_number, 'Visitor destination'))::TEXT AS flat_label,
    v.vehicle_number::TEXT,
    v.photo_url::TEXT,
    v.entry_time,
    v.approval_status::TEXT,
    v.approval_deadline_at,
    v.is_frequent_visitor,
    v.rejection_reason::TEXT
  FROM public.visitors v
  JOIN public.residents r
    ON r.flat_id = v.flat_id
   AND r.auth_user_id = auth.uid()
   AND r.is_active = TRUE
  LEFT JOIN public.flats f ON f.id = v.flat_id
  LEFT JOIN public.buildings b ON b.id = f.building_id
  WHERE v.exit_time IS NULL
    AND v.approval_status = 'pending'
  ORDER BY v.entry_time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_resident_pending_visitors() TO authenticated;
