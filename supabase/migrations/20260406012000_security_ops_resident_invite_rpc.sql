CREATE OR REPLACE FUNCTION public.create_resident_invited_visitor(
  p_visitor_name TEXT,
  p_visitor_type TEXT DEFAULT 'guest',
  p_phone TEXT DEFAULT NULL,
  p_purpose TEXT DEFAULT NULL,
  p_vehicle_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident RECORD;
  v_visitor_id UUID;
  v_visitor_type TEXT := LOWER(COALESCE(NULLIF(BTRIM(p_visitor_type), ''), 'guest'));
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Authentication required');
  END IF;

  IF COALESCE(BTRIM(p_visitor_name), '') = '' THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Visitor name is required');
  END IF;

  SELECT
    r.id,
    r.flat_id,
    r.full_name
  INTO v_resident
  FROM public.residents r
  WHERE r.auth_user_id = auth.uid()
    AND r.is_active = TRUE
  ORDER BY r.is_primary_contact DESC, r.created_at
  LIMIT 1;

  IF v_resident.id IS NULL OR v_resident.flat_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT(
      'success',
      FALSE,
      'error',
      'Resident profile with an assigned flat is required'
    );
  END IF;

  INSERT INTO public.visitors (
    visitor_name,
    visitor_type,
    phone,
    vehicle_number,
    purpose,
    flat_id,
    resident_id,
    approved_by_resident,
    approval_status,
    is_frequent_visitor,
    entry_time,
    exit_time,
    approval_deadline_at,
    decision_at,
    rejection_reason,
    notification_sent_at
  )
  VALUES (
    BTRIM(p_visitor_name),
    v_visitor_type,
    NULLIF(BTRIM(p_phone), ''),
    NULLIF(BTRIM(p_vehicle_number), ''),
    NULLIF(BTRIM(p_purpose), ''),
    v_resident.flat_id,
    v_resident.id,
    TRUE,
    'approved',
    FALSE,
    NULL,
    NULL,
    NULL,
    NOW(),
    NULL,
    NOW()
  )
  RETURNING id INTO v_visitor_id;

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

GRANT EXECUTE ON FUNCTION public.create_resident_invited_visitor(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
