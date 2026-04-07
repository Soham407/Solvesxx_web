CREATE OR REPLACE FUNCTION public.complete_service_task(
  p_request_id UUID,
  p_after_photo_url TEXT,
  p_completion_notes TEXT DEFAULT NULL,
  p_signature_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.service_requests%ROWTYPE;
  v_session public.job_sessions%ROWTYPE;
  v_session_id UUID;
  v_after_photo_url TEXT := NULLIF(BTRIM(p_after_photo_url), '');
  v_completion_notes TEXT := NULLIF(BTRIM(p_completion_notes), '');
BEGIN
  IF v_after_photo_url IS NULL THEN
    RAISE EXCEPTION 'Completion photo evidence is mandatory';
  END IF;

  IF v_completion_notes IS NULL OR LENGTH(v_completion_notes) < 10 THEN
    RAISE EXCEPTION 'Operational Truth Error: Meaningful resolution notes (min 10 chars) required.';
  END IF;

  SELECT *
  INTO v_request
  FROM public.service_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service request % not found', p_request_id;
  END IF;

  SELECT *
  INTO v_session
  FROM public.job_sessions js
  WHERE js.service_request_id = p_request_id
  ORDER BY
    CASE WHEN js.status IN ('started', 'paused') THEN 0 ELSE 1 END,
    js.created_at DESC
  LIMIT 1;

  IF v_session.id IS NULL THEN
    IF v_request.assigned_to IS NULL THEN
      RAISE EXCEPTION 'No technician is assigned to service request %', p_request_id;
    END IF;

    INSERT INTO public.job_sessions (
      service_request_id,
      technician_id,
      start_time,
      end_time,
      status,
      remarks
    )
    VALUES (
      p_request_id,
      v_request.assigned_to,
      COALESCE(v_request.started_at, NOW()),
      NOW(),
      'completed',
      v_completion_notes
    )
    RETURNING * INTO v_session;
  ELSE
    UPDATE public.job_sessions
    SET
      status = 'completed',
      end_time = COALESCE(end_time, NOW()),
      remarks = v_completion_notes,
      updated_at = NOW()
    WHERE id = v_session.id
    RETURNING * INTO v_session;
  END IF;

  v_session_id := v_session.id;

  IF v_request.before_photo_url IS NOT NULL THEN
    INSERT INTO public.job_photos (
      job_session_id,
      photo_type,
      photo_url,
      captured_at
    )
    SELECT
      v_session_id,
      'before',
      v_request.before_photo_url,
      NOW()
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.job_photos jp
      WHERE jp.job_session_id = v_session_id
        AND jp.photo_type = 'before'
        AND jp.photo_url = v_request.before_photo_url
    );
  END IF;

  INSERT INTO public.job_photos (
    job_session_id,
    photo_type,
    photo_url,
    captured_at
  )
  SELECT
    v_session_id,
    'after',
    v_after_photo_url,
    NOW()
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.job_photos jp
    WHERE jp.job_session_id = v_session_id
      AND jp.photo_type = 'after'
      AND jp.photo_url = v_after_photo_url
  );

  UPDATE public.service_requests
  SET
    status = 'completed',
    completed_at = NOW(),
    after_photo_url = v_after_photo_url,
    completion_notes = v_completion_notes,
    resolution_notes = v_completion_notes,
    completion_signature_url = p_signature_url,
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_service_task(UUID, TEXT, TEXT, TEXT) TO authenticated;
