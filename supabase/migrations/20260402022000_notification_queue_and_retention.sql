CREATE EXTENSION IF NOT EXISTS http;
CREATE EXTENSION IF NOT EXISTS pg_cron;

ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notification_logs_notification_id
  ON public.notification_logs(notification_id, sent_at DESC);

ALTER TABLE public.visitors
  ADD COLUMN IF NOT EXISTS pii_redacted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.trigger_mobile_notification_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_response RECORD;
  v_service_role_key TEXT;
BEGIN
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  IF COALESCE(v_service_role_key, '') = '' THEN
    RAISE NOTICE 'dispatch-notification-queue skipped because app.settings.service_role_key is not configured';
    RETURN;
  END IF;

  SELECT http.status, http.content::jsonb
  INTO v_response
  FROM http((
    'POST',
    'https://wwhbdgwfodumognpkgrf.supabase.co/functions/v1/dispatch-notification-queue',
    ARRAY[
      http_header('Authorization', 'Bearer ' || v_service_role_key),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    '{}'
  )) AS http;

  RAISE NOTICE 'dispatch-notification-queue: %', v_response;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'dispatch-notification-queue failed: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_daily_mobile_checklist_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_response RECORD;
  v_service_role_key TEXT;
BEGIN
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  IF COALESCE(v_service_role_key, '') = '' THEN
    RAISE NOTICE 'checklist-reminders skipped because app.settings.service_role_key is not configured';
    RETURN;
  END IF;

  SELECT http.status, http.content::jsonb
  INTO v_response
  FROM http((
    'POST',
    'https://wwhbdgwfodumognpkgrf.supabase.co/functions/v1/checklist-reminders',
    ARRAY[
      http_header('Authorization', 'Bearer ' || v_service_role_key),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    '{}'
  )) AS http;

  RAISE NOTICE 'checklist-reminders: %', v_response;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'checklist-reminders failed: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_expired_visitor_personal_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_redacted_count INTEGER := 0;
BEGIN
  WITH expired_visitors AS (
    SELECT
      v.id,
      v.photo_url,
      CASE
        WHEN v.photo_url LIKE 'storage://%' THEN split_part(replace(v.photo_url, 'storage://', ''), '/', 1)
        WHEN position('/' IN COALESCE(v.photo_url, '')) > 0 THEN split_part(v.photo_url, '/', 1)
        ELSE NULL
      END AS bucket_id,
      CASE
        WHEN v.photo_url LIKE 'storage://%' THEN substring(replace(v.photo_url, 'storage://', '') FROM position('/' IN replace(v.photo_url, 'storage://', '')) + 1)
        WHEN position('/' IN COALESCE(v.photo_url, '')) > 0 THEN substring(v.photo_url FROM position('/' IN v.photo_url) + 1)
        ELSE NULL
      END AS object_path
    FROM public.visitors v
    WHERE
      v.entry_time < NOW() - INTERVAL '90 days'
      AND v.pii_redacted_at IS NULL
  ),
  deleted_storage_objects AS (
    DELETE FROM storage.objects so
    USING expired_visitors ev
    WHERE
      ev.bucket_id IS NOT NULL
      AND ev.object_path IS NOT NULL
      AND so.bucket_id = ev.bucket_id
      AND so.name = ev.object_path
    RETURNING so.id
  ),
  redacted_visitors AS (
    UPDATE public.visitors v
    SET
      visitor_name = 'Redacted visitor',
      phone = NULL,
      vehicle_number = NULL,
      photo_url = NULL,
      pii_redacted_at = NOW()
    FROM expired_visitors ev
    WHERE v.id = ev.id
    RETURNING v.id
  )
  SELECT COUNT(*)
  INTO v_redacted_count
  FROM redacted_visitors;

  RETURN COALESCE(v_redacted_count, 0);
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('dispatch-mobile-notifications');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'dispatch-mobile-notifications',
  '* * * * *',
  'SELECT public.trigger_mobile_notification_queue();'
);

DO $$
BEGIN
  PERFORM cron.unschedule('checklist-reminders');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-mobile-checklist-reminders');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'daily-mobile-checklist-reminders',
  '30 3 * * *',
  'SELECT public.trigger_daily_mobile_checklist_reminders();'
);

DO $$
BEGIN
  PERFORM cron.unschedule('purge-visitor-personal-data');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'purge-visitor-personal-data',
  '15 2 * * *',
  'SELECT public.purge_expired_visitor_personal_data();'
);
