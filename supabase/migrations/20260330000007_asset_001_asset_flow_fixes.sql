-- =============================================================================
-- Migration: 20260330000007_asset_001_asset_flow_fixes.sql
-- Purpose:   ASSET-001 lifecycle hardening for QR batch ownership and
--            service-request/job-session evidence synchronization.
-- =============================================================================

-- ============================================================
-- 1. QR batch logs should track the authenticated auth user.
--    The API route already writes auth.users(id), so align the FK.
-- ============================================================
ALTER TABLE public.qr_batch_logs
  DROP CONSTRAINT IF EXISTS qr_batch_logs_generated_by_fkey;

ALTER TABLE public.qr_batch_logs
  ADD CONSTRAINT qr_batch_logs_generated_by_fkey
  FOREIGN KEY (generated_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

CREATE OR REPLACE VIEW public.qr_codes_with_batch_info
WITH (security_invoker = on) AS
SELECT
  qc.*,
  qb.generated_at AS batch_generated_at,
  qb.generated_by AS batch_generated_by,
  COALESCE(u.full_name::text, 'Unknown'::text) AS generated_by_name,
  qb.count AS batch_count,
  a.name AS linked_asset_name,
  a.asset_code AS linked_asset_tag,
  w.warehouse_name
FROM public.qr_codes qc
LEFT JOIN public.qr_batch_logs qb
  ON qc.batch_id = qb.batch_id
LEFT JOIN public.users u
  ON qb.generated_by = u.id
LEFT JOIN public.assets a
  ON qc.asset_id = a.id
LEFT JOIN public.warehouses w
  ON qc.warehouse_id = w.id;

GRANT SELECT ON public.qr_codes_with_batch_info TO authenticated;

-- ============================================================
-- 2. Starting a service task must also open/reuse a job session
--    and record the before-evidence photo against that session.
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_service_task(
  p_request_id UUID,
  p_before_photo_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.service_requests%ROWTYPE;
  v_session_id UUID;
  v_before_photo_url TEXT := NULLIF(p_before_photo_url, '');
BEGIN
  SELECT *
  INTO v_request
  FROM public.service_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service request % not found', p_request_id;
  END IF;

  IF v_request.assigned_to IS NULL THEN
    RAISE EXCEPTION 'Service request must be assigned before it can be started';
  END IF;

  UPDATE public.service_requests
  SET
    status = 'in_progress',
    started_at = COALESCE(started_at, NOW()),
    before_photo_url = COALESCE(v_before_photo_url, before_photo_url),
    updated_at = NOW()
  WHERE id = p_request_id;

  SELECT js.id
  INTO v_session_id
  FROM public.job_sessions js
  WHERE js.service_request_id = p_request_id
    AND js.status IN ('started', 'paused')
  ORDER BY js.created_at DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    INSERT INTO public.job_sessions (
      service_request_id,
      technician_id,
      start_time,
      status
    )
    VALUES (
      p_request_id,
      v_request.assigned_to,
      COALESCE(v_request.started_at, NOW()),
      'started'
    )
    RETURNING id INTO v_session_id;
  ELSE
    UPDATE public.job_sessions
    SET
      status = 'started',
      start_time = COALESCE(start_time, COALESCE(v_request.started_at, NOW())),
      updated_at = NOW()
    WHERE id = v_session_id;
  END IF;

  IF v_before_photo_url IS NOT NULL THEN
    INSERT INTO public.job_photos (
      job_session_id,
      photo_type,
      photo_url,
      captured_at
    )
    SELECT
      v_session_id,
      'before',
      v_before_photo_url,
      NOW()
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.job_photos jp
      WHERE jp.job_session_id = v_session_id
        AND jp.photo_type = 'before'
        AND jp.photo_url = v_before_photo_url
    );
  END IF;

  RETURN TRUE;
END;
$$;

-- ============================================================
-- 3. Completing a service task must close the job session and
--    persist the after-evidence photo in both layers.
-- ============================================================
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
  v_after_photo_url TEXT := NULLIF(p_after_photo_url, '');
BEGIN
  IF v_after_photo_url IS NULL THEN
    RAISE EXCEPTION 'Completion photo evidence is mandatory';
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
      p_completion_notes
    )
    RETURNING * INTO v_session;
  ELSE
    UPDATE public.job_sessions
    SET
      status = 'completed',
      end_time = COALESCE(end_time, NOW()),
      remarks = COALESCE(p_completion_notes, remarks),
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
    completion_notes = p_completion_notes,
    completion_signature_url = p_signature_url,
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_service_task(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_service_task(UUID, TEXT, TEXT, TEXT) TO authenticated;
