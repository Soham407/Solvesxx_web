-- Guard ops backend truth repairs:
-- 1. Support geo_fence_breach in mobile panic alerts so mobile and web use the same alert taxonomy.
-- 2. Keep notification payloads aligned with the chosen alert type.

CREATE OR REPLACE FUNCTION public.start_mobile_panic_alert(
  p_alert_type TEXT DEFAULT 'panic',
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guard_id UUID;
  v_location_id UUID;
  v_alert_id UUID;
  v_alert_type alert_type;
  v_recipient RECORD;
  v_guard_name TEXT;
  v_notified_count INTEGER := 0;
  v_alert_label TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT is_guard() THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Only authenticated guards can raise alerts');
  END IF;

  SELECT
    sg.id,
    sg.assigned_location_id,
    TRIM(COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, ''))
  INTO
    v_guard_id,
    v_location_id,
    v_guard_name
  FROM public.security_guards sg
  JOIN public.employees e ON e.id = sg.employee_id
  WHERE e.auth_user_id = auth.uid()
  LIMIT 1;

  IF v_guard_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Guard profile not found');
  END IF;

  v_alert_type := CASE
    WHEN COALESCE(LOWER(p_alert_type), 'panic') = 'inactivity' THEN 'inactivity'
    WHEN COALESCE(LOWER(p_alert_type), 'panic') = 'geo_fence_breach' THEN 'geo_fence_breach'
    ELSE 'panic'
  END;

  v_alert_label := CASE v_alert_type
    WHEN 'geo_fence_breach' THEN 'Geo-fence Breach'
    WHEN 'inactivity' THEN 'Inactivity Alert'
    ELSE 'SOS / Panic Alert'
  END;

  INSERT INTO public.panic_alerts (
    guard_id,
    alert_type,
    location_id,
    latitude,
    longitude,
    description,
    photo_url,
    streaming_active,
    metadata
  )
  VALUES (
    v_guard_id,
    v_alert_type,
    v_location_id,
    p_latitude,
    p_longitude,
    NULLIF(p_description, ''),
    NULLIF(p_photo_url, ''),
    TRUE,
    COALESCE(p_metadata, '{}'::JSONB)
  )
  RETURNING id INTO v_alert_id;

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
      v_alert_label,
      COALESCE(NULLIF(v_guard_name, ''), 'A guard') || ' triggered a ' || REPLACE(v_alert_type::TEXT, '_', ' ') || ' alert with live location.',
      'panic',
      'critical',
      '/society/panic-alerts',
      JSONB_BUILD_OBJECT(
        'alert_id', v_alert_id,
        'guard_id', v_guard_id,
        'alert_type', v_alert_type::TEXT
      ),
      'push_queued',
      'queued',
      CASE
        WHEN v_alert_type::TEXT = 'panic' THEN NOW()
        ELSE NOW() + INTERVAL '60 seconds'
      END
    );
    v_notified_count := v_notified_count + 1;
  END LOOP;

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'alert_id', v_alert_id,
    'guard_id', v_guard_id,
    'notified_count', v_notified_count
  );
END;
$$;
