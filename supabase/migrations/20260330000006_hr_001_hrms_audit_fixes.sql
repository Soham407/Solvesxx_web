-- ============================================
-- Migration: HR-001 HRMS audit fixes
-- Description: Align auto punch-out cron with attendance audit fields.
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

ALTER TABLE public.attendance_logs
ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE OR REPLACE FUNCTION public.auto_punch_out_idle_employees()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_updated_count integer;
BEGIN
  UPDATE public.attendance_logs
  SET
    check_out_time = (log_date::timestamptz + INTERVAL '23 hours 59 minutes 59 seconds'),
    total_hours = CASE
      WHEN check_in_time IS NULL THEN total_hours
      ELSE ROUND(
        EXTRACT(
          EPOCH FROM (
            (log_date::timestamptz + INTERVAL '23 hours 59 minutes 59 seconds') - check_in_time
          )
        ) / 3600.0,
        2
      )
    END,
    is_auto_punch_out = TRUE,
    status = 'absent_breach',
    notes = TRIM(
      BOTH ' '
      FROM CONCAT_WS(' | ', NULLIF(notes, ''), 'Auto-punched out by system at end of day.')
    )
  WHERE check_out_time IS NULL
    AND check_in_time IS NOT NULL
    AND log_date < CURRENT_DATE;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'auto_punch_out: Updated % attendance records.', v_updated_count;
END;
$$;

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'auto-punch-out-daily'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'auto-punch-out-daily',
    '0 1 * * *',
    'SELECT public.auto_punch_out_idle_employees();'
  );
END;
$$;
