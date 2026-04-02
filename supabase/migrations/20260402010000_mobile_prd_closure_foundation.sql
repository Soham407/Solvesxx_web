-- =============================================================================
-- Mobile PRD closure foundation
-- Adds mobile-facing data contracts for alerts, visitors, oversight, notifications,
-- checklist metadata, and authenticated RPC helpers.
-- =============================================================================

ALTER TABLE public.panic_alerts
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS acknowledged_notes TEXT,
  ADD COLUMN IF NOT EXISTS streaming_active BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

ALTER TABLE public.visitors
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approval_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decision_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS delivery_state TEXT NOT NULL DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS fallback_state TEXT NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_fallback_at TIMESTAMPTZ;

ALTER TABLE public.daily_checklist_items
  ADD COLUMN IF NOT EXISTS input_type TEXT NOT NULL DEFAULT 'yes_no',
  ADD COLUMN IF NOT EXISTS numeric_unit_label TEXT,
  ADD COLUMN IF NOT EXISTS numeric_min_value NUMERIC,
  ADD COLUMN IF NOT EXISTS numeric_max_value NUMERIC,
  ADD COLUMN IF NOT EXISTS requires_supervisor_override BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_visitors_approval_status
  ON public.visitors(approval_status, approval_deadline_at);

CREATE INDEX IF NOT EXISTS idx_panic_alerts_ack_state
  ON public.panic_alerts(is_resolved, acknowledged_at, alert_time DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_delivery_state
  ON public.notifications(user_id, delivery_state, created_at DESC);

CREATE OR REPLACE FUNCTION public.mobile_insert_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_type TEXT,
  p_priority TEXT DEFAULT 'normal',
  p_action_url TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::JSONB,
  p_delivery_state TEXT DEFAULT 'created',
  p_fallback_state TEXT DEFAULT 'not_applicable',
  p_sms_fallback_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    body,
    type,
    priority,
    action_url,
    data,
    delivery_state,
    fallback_state,
    sms_fallback_at
  )
  VALUES (
    p_user_id,
    LEFT(COALESCE(p_title, ''), 200),
    LEFT(COALESCE(p_body, ''), 1000),
    COALESCE(p_type, 'general'),
    COALESCE(p_priority, 'normal'),
    p_action_url,
    COALESCE(p_data, '{}'::JSONB),
    COALESCE(p_delivery_state, 'created'),
    COALESCE(p_fallback_state, 'not_applicable'),
    p_sms_fallback_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_push_token(
  p_token TEXT,
  p_device_type TEXT DEFAULT 'unknown',
  p_token_type TEXT DEFAULT 'fcm'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF COALESCE(btrim(p_token), '') = '' THEN
    RAISE EXCEPTION 'Push token is required';
  END IF;

  INSERT INTO public.push_tokens (
    user_id,
    token,
    token_type,
    device_type,
    last_used,
    is_active
  )
  VALUES (
    auth.uid(),
    p_token,
    COALESCE(NULLIF(btrim(p_token_type), ''), 'fcm'),
    COALESCE(NULLIF(btrim(p_device_type), ''), 'unknown'),
    NOW(),
    TRUE
  )
  ON CONFLICT (user_id, token)
  DO UPDATE SET
    token_type = EXCLUDED.token_type,
    device_type = EXCLUDED.device_type,
    last_used = NOW(),
    is_active = TRUE
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_resident_destinations(
  p_search TEXT DEFAULT ''
)
RETURNS TABLE (
  flat_id UUID,
  flat_label TEXT,
  resident_id UUID,
  resident_name TEXT,
  resident_phone TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH matched AS (
    SELECT
      f.id AS flat_id,
      TRIM(
        COALESCE(b.building_name || ' - ', '')
        || f.flat_number
      ) AS flat_label,
      r.id AS resident_id,
      r.full_name AS resident_name,
      COALESCE(r.phone, r.alternate_phone) AS resident_phone,
      ROW_NUMBER() OVER (
        PARTITION BY f.id
        ORDER BY r.is_primary_contact DESC, r.created_at
      ) AS resident_rank
    FROM public.flats f
    LEFT JOIN public.buildings b ON b.id = f.building_id
    LEFT JOIN public.residents r
      ON r.flat_id = f.id
     AND r.is_active = TRUE
    WHERE
      p_search = ''
      OR f.flat_number ILIKE '%' || p_search || '%'
      OR COALESCE(b.building_name, '') ILIKE '%' || p_search || '%'
      OR COALESCE(r.full_name, '') ILIKE '%' || p_search || '%'
      OR COALESCE(r.phone, '') ILIKE '%' || p_search || '%'
  )
  SELECT
    matched.flat_id,
    matched.flat_label,
    matched.resident_id,
    matched.resident_name,
    matched.resident_phone
  FROM matched
  WHERE matched.resident_rank = 1
  ORDER BY matched.flat_label
  LIMIT 25;
$$;

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
    ELSE 'panic'
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
      'SOS / Panic Alert',
      COALESCE(NULLIF(v_guard_name, ''), 'A guard') || ' triggered a ' || v_alert_type::TEXT || ' alert with live location.',
      'panic',
      'critical',
      '/oversight/alerts',
      JSONB_BUILD_OBJECT(
        'alert_id', v_alert_id,
        'guard_id', v_guard_id,
        'alert_type', v_alert_type::TEXT
      ),
      'push_queued',
      'queued',
      CASE WHEN v_alert_type::TEXT = 'panic' THEN NOW() ELSE NOW() + INTERVAL '60 seconds' END
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

CREATE OR REPLACE FUNCTION public.acknowledge_mobile_panic_alert(
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
BEGIN
  IF auth.uid() IS NULL OR NOT (
    has_role('security_supervisor')
    OR has_role('society_manager')
    OR has_role('admin')
    OR has_role('super_admin')
  ) THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Only oversight users can acknowledge alerts');
  END IF;

  UPDATE public.panic_alerts
  SET
    acknowledged_at = NOW(),
    acknowledged_by = auth.uid(),
    acknowledged_notes = NULLIF(p_notes, '')
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
      'SOS acknowledged',
      'Your panic alert has been acknowledged by the control room.',
      'panic_acknowledged',
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
BEGIN
  IF auth.uid() IS NULL OR NOT (
    has_role('security_supervisor')
    OR has_role('society_manager')
    OR has_role('admin')
    OR has_role('super_admin')
  ) THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Only oversight users can resolve alerts');
  END IF;

  UPDATE public.panic_alerts
  SET
    is_resolved = TRUE,
    resolved_at = NOW(),
    resolved_by = auth.uid(),
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

  IF COALESCE(btrim(p_visitor_name), '') = '' OR p_flat_id IS NULL THEN
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
    v_auto_approve,
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

CREATE OR REPLACE FUNCTION public.get_guard_visitors(
  p_include_checked_out BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id UUID,
  visitor_name TEXT,
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
  is_frequent_visitor BOOLEAN,
  approval_status TEXT,
  approval_deadline_at TIMESTAMPTZ,
  decision_at TIMESTAMPTZ,
  approved_by_resident BOOLEAN,
  rejection_reason TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id,
    v.visitor_name,
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
    v.is_frequent_visitor,
    CASE
      WHEN v.exit_time IS NOT NULL THEN 'checked_out'
      WHEN v.approval_status = 'pending'
           AND v.approval_deadline_at IS NOT NULL
           AND v.approval_deadline_at < NOW()
        THEN 'timeout'
      ELSE v.approval_status
    END AS approval_status,
    v.approval_deadline_at,
    v.decision_at,
    v.approved_by_resident,
    v.rejection_reason
  FROM public.visitors v
  LEFT JOIN public.flats f ON f.id = v.flat_id
  LEFT JOIN public.buildings b ON b.id = f.building_id
  LEFT JOIN public.residents r ON r.id = v.resident_id
  WHERE
    v.entry_guard_id = get_guard_id()
    AND (p_include_checked_out OR v.exit_time IS NULL)
  ORDER BY v.entry_time DESC;
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
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
    CASE
      WHEN v.approval_status = 'pending'
           AND v.approval_deadline_at IS NOT NULL
           AND v.approval_deadline_at < NOW()
        THEN 'timeout'
      ELSE v.approval_status
    END AS approval_status,
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
$$;

CREATE OR REPLACE FUNCTION public.set_resident_frequent_visitor(
  p_visitor_id UUID,
  p_is_frequent BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flat_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT is_resident() THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Only residents can manage frequent visitors');
  END IF;

  SELECT flat_id
  INTO v_flat_id
  FROM public.residents
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  UPDATE public.visitors
  SET is_frequent_visitor = p_is_frequent
  WHERE id = p_visitor_id
    AND flat_id = v_flat_id;

  IF NOT FOUND THEN
    RETURN JSONB_BUILD_OBJECT('success', FALSE, 'error', 'Visitor not found for this resident');
  END IF;

  RETURN JSONB_BUILD_OBJECT('success', TRUE, 'visitor_id', p_visitor_id, 'is_frequent', p_is_frequent);
END;
$$;

CREATE OR REPLACE FUNCTION public.mobile_refresh_visitor_decision_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.exit_time IS NOT NULL AND NEW.approval_status = 'pending' THEN
    NEW.approval_status := 'checked_out';
  ELSIF NEW.approved_by_resident = TRUE THEN
    NEW.approval_status := 'approved';
    NEW.decision_at := COALESCE(NEW.decision_at, NOW());
  ELSIF NEW.rejection_reason IS NOT NULL AND btrim(NEW.rejection_reason) <> '' THEN
    NEW.approval_status := 'denied';
    NEW.decision_at := COALESCE(NEW.decision_at, NOW());
  ELSIF NEW.approval_status IS NULL THEN
    NEW.approval_status := 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_mobile_refresh_visitor_decision_state ON public.visitors;
CREATE TRIGGER tr_mobile_refresh_visitor_decision_state
BEFORE INSERT OR UPDATE OF approved_by_resident, rejection_reason, exit_time, approval_status
ON public.visitors
FOR EACH ROW
EXECUTE FUNCTION public.mobile_refresh_visitor_decision_state();

CREATE OR REPLACE FUNCTION public.get_oversight_live_guards()
RETURNS TABLE (
  id UUID,
  guard_name TEXT,
  guard_code TEXT,
  assigned_location_name TEXT,
  status TEXT,
  last_seen_at TIMESTAMPTZ,
  checklist_completed INTEGER,
  checklist_total INTEGER,
  current_shift_label TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  visitors_handled_today BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest_gps AS (
    SELECT DISTINCT ON (gt.employee_id)
      gt.employee_id,
      gt.latitude,
      gt.longitude,
      gt.tracked_at
    FROM public.gps_tracking gt
    ORDER BY gt.employee_id, gt.tracked_at DESC
  ),
  attendance AS (
    SELECT
      al.employee_id,
      MAX(al.check_in_time) FILTER (WHERE al.log_date = CURRENT_DATE) AS last_check_in,
      MAX(al.check_out_time) FILTER (WHERE al.log_date = CURRENT_DATE) AS last_check_out
    FROM public.attendance_logs al
    GROUP BY al.employee_id
  ),
  checklist AS (
    SELECT
      e.id AS employee_id,
      COALESCE(MAX(JSONB_ARRAY_LENGTH(cr.responses)), 0) AS checklist_completed
    FROM public.employees e
    LEFT JOIN public.checklist_responses cr
      ON cr.employee_id = e.id
     AND cr.response_date = CURRENT_DATE
    GROUP BY e.id
  ),
  checklist_total AS (
    SELECT COUNT(*)::INTEGER AS total_items
    FROM public.daily_checklist_items dci
    WHERE dci.is_active = TRUE
  ),
  visitors_today AS (
    SELECT
      v.entry_guard_id AS guard_id,
      COUNT(*)::BIGINT AS handled_today
    FROM public.visitors v
    WHERE v.entry_time::DATE = CURRENT_DATE
    GROUP BY v.entry_guard_id
  )
  SELECT
    sg.id,
    TRIM(COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')) AS guard_name,
    sg.guard_code,
    COALESCE(cl.location_name, 'Assigned gate') AS assigned_location_name,
    CASE
      WHEN a.last_check_in IS NULL OR a.last_check_out IS NOT NULL THEN 'off_duty'
      WHEN lg.tracked_at IS NULL OR lg.tracked_at < NOW() - INTERVAL '10 minutes' THEN 'offline'
      WHEN
        lg.tracked_at IS NOT NULL
        AND cl.latitude IS NOT NULL
        AND cl.longitude IS NOT NULL
        AND NOT check_geofence(
          lg.latitude::DOUBLE PRECISION,
          lg.longitude::DOUBLE PRECISION,
          cl.latitude::DOUBLE PRECISION,
          cl.longitude::DOUBLE PRECISION,
          COALESCE(cl.geo_fence_radius::DOUBLE PRECISION, 100.0)
        ) THEN 'breach'
      ELSE 'on_duty'
    END AS status,
    COALESCE(lg.tracked_at, a.last_check_in) AS last_seen_at,
    COALESCE(c.checklist_completed, 0) AS checklist_completed,
    COALESCE(ct.total_items, 0) AS checklist_total,
    COALESCE(sg.shift_timing, 'Active shift') AS current_shift_label,
    COALESCE(lg.latitude::DOUBLE PRECISION, cl.latitude::DOUBLE PRECISION, 0) AS latitude,
    COALESCE(lg.longitude::DOUBLE PRECISION, cl.longitude::DOUBLE PRECISION, 0) AS longitude,
    COALESCE(vt.handled_today, 0) AS visitors_handled_today
  FROM public.security_guards sg
  JOIN public.employees e ON e.id = sg.employee_id
  LEFT JOIN public.company_locations cl ON cl.id = sg.assigned_location_id
  LEFT JOIN latest_gps lg ON lg.employee_id = sg.id
  LEFT JOIN attendance a ON a.employee_id = e.id
  LEFT JOIN checklist c ON c.employee_id = e.id
  CROSS JOIN checklist_total ct
  LEFT JOIN visitors_today vt ON vt.guard_id = sg.id
  WHERE sg.is_active = TRUE
  ORDER BY guard_name;
$$;

CREATE OR REPLACE FUNCTION public.get_oversight_alert_feed()
RETURNS TABLE (
  id UUID,
  guard_id UUID,
  guard_name TEXT,
  location_name TEXT,
  alert_type TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  note TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pa.id,
    pa.guard_id,
    TRIM(COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')) AS guard_name,
    COALESCE(cl.location_name, 'Unknown location') AS location_name,
    pa.alert_type::TEXT AS alert_type,
    CASE
      WHEN pa.is_resolved THEN 'resolved'
      WHEN pa.acknowledged_at IS NOT NULL THEN 'acknowledged'
      ELSE 'active'
    END AS status,
    pa.alert_time AS created_at,
    COALESCE(pa.description, 'Guard alert raised from mobile workflow.') AS note
  FROM public.panic_alerts pa
  JOIN public.security_guards sg ON sg.id = pa.guard_id
  JOIN public.employees e ON e.id = sg.employee_id
  LEFT JOIN public.company_locations cl ON cl.id = COALESCE(pa.location_id, sg.assigned_location_id)
  ORDER BY pa.alert_time DESC
  LIMIT 100;
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cl.id,
    cl.location_name AS gate_name,
    COUNT(*) FILTER (WHERE v.entry_time::DATE = CURRENT_DATE)::BIGINT AS visitors_today,
    COUNT(*) FILTER (WHERE v.entry_time >= DATE_TRUNC('week', NOW()))::BIGINT AS visitors_this_week,
    COUNT(*) FILTER (
      WHERE v.exit_time IS NULL
        AND (
          v.approval_status = 'pending'
          OR (
            v.approval_status = 'pending'
            AND v.approval_deadline_at IS NOT NULL
            AND v.approval_deadline_at >= NOW()
          )
        )
    )::BIGINT AS pending_approvals,
    COUNT(*) FILTER (
      WHERE COALESCE(v.vehicle_number, '') <> ''
    )::BIGINT AS delivery_vehicles
  FROM public.company_locations cl
  LEFT JOIN public.visitors v ON v.entry_location_id = cl.id
  GROUP BY cl.id, cl.location_name
  ORDER BY cl.location_name;
$$;

CREATE OR REPLACE FUNCTION public.get_guard_checklist_items()
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
  submitted_at TIMESTAMPTZ
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
      cr.submitted_at
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
    lr.submitted_at
  FROM public.daily_checklist_items dci
  LEFT JOIN latest_response lr ON lr.checklist_id = dci.checklist_id
  LEFT JOIN LATERAL (
    SELECT item.value
    FROM JSONB_ARRAY_ELEMENTS(COALESCE(lr.responses, '[]'::JSONB)) AS item(value)
    WHERE item.value ->> 'master_item_id' = dci.id::TEXT
    LIMIT 1
  ) response_item ON TRUE
  WHERE dci.is_active = TRUE
  ORDER BY dci.priority, dci.created_at;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_push_token(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_resident_destinations(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_mobile_panic_alert(TEXT, NUMERIC, NUMERIC, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_mobile_panic_alert(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_mobile_panic_alert(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_mobile_visitor(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_guard_visitors(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_resident_pending_visitors() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_resident_frequent_visitor(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_oversight_live_guards() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_oversight_alert_feed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_oversight_visitor_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_guard_checklist_items() TO authenticated;
