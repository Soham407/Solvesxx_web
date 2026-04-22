-- RPC functions for panic alert SMS and push notifications
-- These call the send-notification edge function via pg_net

-- ============================================================
-- 1. send_panic_alert_sms
-- Called by guard app when panic button is triggered
-- Sends SMS to the provided manager phone, and FCM push to all admins
-- ============================================================
CREATE OR REPLACE FUNCTION public.send_panic_alert_sms(
  p_alert_type    TEXT,
  p_guard_name    TEXT,
  p_guard_phone   TEXT    DEFAULT NULL,
  p_latitude      NUMERIC DEFAULT NULL,
  p_longitude     NUMERIC DEFAULT NULL,
  p_manager_phone TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location_msg TEXT;
  v_title        TEXT;
  v_body_text    TEXT;
  v_manager      RECORD;
  v_service_key  CONSTANT TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3aGJkZ3dmb2R1bW9nbnBrZ3JmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDEzNjI5OCwiZXhwIjoyMDg1NzEyMjk4fQ.NcWmV8qrc1ONvVFk1MCwS1ThYouB8sAzXBiXQm6-2N4';
BEGIN
  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    v_location_msg := format('Location: %s, %s', round(p_latitude::NUMERIC, 5), round(p_longitude::NUMERIC, 5));
  ELSE
    v_location_msg := 'Location unavailable';
  END IF;

  v_title     := format('PANIC ALERT: %s', upper(p_alert_type));
  v_body_text := format('Guard %s triggered a %s alert. %s', p_guard_name, p_alert_type, v_location_msg);

  -- Send SMS to the provided manager phone number
  IF p_manager_phone IS NOT NULL AND p_manager_phone <> '' THEN
    PERFORM net.http_post(
      url     := 'https://wwhbdgwfodumognpkgrf.supabase.co/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body    := jsonb_build_object(
        'mobile',  p_manager_phone,
        'title',   v_title,
        'body',    v_body_text,
        'channel', 'sms'
      )::TEXT
    );
  END IF;

  -- Send FCM push to all admin/manager users
  FOR v_manager IN
    SELECT u.id
    FROM   users u
    JOIN   roles r ON u.role_id = r.id
    WHERE  r.role_name IN ('admin', 'company_md', 'company_hod')
  LOOP
    PERFORM net.http_post(
      url     := 'https://wwhbdgwfodumognpkgrf.supabase.co/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body    := jsonb_build_object(
        'user_id', v_manager.id::TEXT,
        'title',   v_title,
        'body',    v_body_text,
        'channel', 'fcm',
        'data',    jsonb_build_object(
          'alert_type',  p_alert_type,
          'guard_name',  p_guard_name,
          'latitude',    COALESCE(p_latitude::TEXT, ''),
          'longitude',   COALESCE(p_longitude::TEXT, '')
        )
      )::TEXT
    );
  END LOOP;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_panic_alert_sms(TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT) TO authenticated;


-- ============================================================
-- 2. send_push_notification_to_manager
-- Called by guard app to push FCM alert to all admin/manager users
-- ============================================================
CREATE OR REPLACE FUNCTION public.send_push_notification_to_manager(
  p_alert_type TEXT,
  p_guard_name TEXT,
  p_latitude   NUMERIC DEFAULT NULL,
  p_longitude  NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location_msg TEXT;
  v_title        TEXT;
  v_body_text    TEXT;
  v_manager      RECORD;
  v_service_key  CONSTANT TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3aGJkZ3dmb2R1bW9nbnBrZ3JmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDEzNjI5OCwiZXhwIjoyMDg1NzEyMjk4fQ.NcWmV8qrc1ONvVFk1MCwS1ThYouB8sAzXBiXQm6-2N4';
BEGIN
  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    v_location_msg := format('Location: %s, %s', round(p_latitude::NUMERIC, 5), round(p_longitude::NUMERIC, 5));
  ELSE
    v_location_msg := 'Location unavailable';
  END IF;

  v_title     := format('ALERT: %s', upper(p_alert_type));
  v_body_text := format('Guard %s — %s. %s', p_guard_name, p_alert_type, v_location_msg);

  FOR v_manager IN
    SELECT u.id
    FROM   users u
    JOIN   roles r ON u.role_id = r.id
    WHERE  r.role_name IN ('admin', 'company_md', 'company_hod')
  LOOP
    PERFORM net.http_post(
      url     := 'https://wwhbdgwfodumognpkgrf.supabase.co/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body    := jsonb_build_object(
        'user_id', v_manager.id::TEXT,
        'title',   v_title,
        'body',    v_body_text,
        'channel', 'fcm',
        'data',    jsonb_build_object(
          'alert_type', p_alert_type,
          'guard_name', p_guard_name,
          'latitude',   COALESCE(p_latitude::TEXT, ''),
          'longitude',  COALESCE(p_longitude::TEXT, '')
        )
      )::TEXT
    );
  END LOOP;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_push_notification_to_manager(TEXT, TEXT, NUMERIC, NUMERIC) TO authenticated;


-- ============================================================
-- 3. send_custom_sms
-- Called by guard app to send a free-form SMS to any phone number
-- ============================================================
CREATE OR REPLACE FUNCTION public.send_custom_sms(
  p_phone_number TEXT,
  p_message      TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_key CONSTANT TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3aGJkZ3dmb2R1bW9nbnBrZ3JmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDEzNjI5OCwiZXhwIjoyMDg1NzEyMjk4fQ.NcWmV8qrc1ONvVFk1MCwS1ThYouB8sAzXBiXQm6-2N4';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF COALESCE(btrim(p_phone_number), '') = '' THEN
    RAISE EXCEPTION 'Phone number is required';
  END IF;

  IF COALESCE(btrim(p_message), '') = '' THEN
    RAISE EXCEPTION 'Message is required';
  END IF;

  PERFORM net.http_post(
    url     := 'https://wwhbdgwfodumognpkgrf.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := jsonb_build_object(
      'mobile',  p_phone_number,
      'title',   'FacilityPro Alert',
      'body',    p_message,
      'channel', 'sms'
    )::TEXT
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_custom_sms(TEXT, TEXT) TO authenticated;
