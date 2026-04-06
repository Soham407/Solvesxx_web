ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS action_url TEXT;

UPDATE public.notifications
SET action_url = COALESCE(
  action_url,
  NULLIF(data->>'action_url', ''),
  NULLIF(data->>'route', '')
)
WHERE action_url IS NULL;

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
  v_data JSONB := COALESCE(p_data, '{}'::JSONB);
BEGIN
  IF COALESCE(NULLIF(BTRIM(p_action_url), ''), '') <> '' THEN
    v_data := v_data || JSONB_BUILD_OBJECT('action_url', p_action_url);
  END IF;

  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    notification_type,
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
    COALESCE(NULLIF(BTRIM(p_type), ''), 'general'),
    COALESCE(NULLIF(BTRIM(p_priority), ''), 'normal'),
    NULLIF(BTRIM(p_action_url), ''),
    v_data,
    COALESCE(NULLIF(BTRIM(p_delivery_state), ''), 'created'),
    COALESCE(NULLIF(BTRIM(p_fallback_state), ''), 'not_applicable'),
    p_sms_fallback_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
