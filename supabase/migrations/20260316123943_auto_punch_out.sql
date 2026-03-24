-- Auto Punch-Out Cron Job
CREATE OR REPLACE FUNCTION auto_punch_out_idle_employees()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE attendance_logs
  SET
    check_out_time = (log_date::timestamptz + INTERVAL '23 hours 59 minutes 59 seconds'),
    notes = COALESCE(notes || ' | ', '') || 'Auto-punched out by system at end of day.'
  WHERE
    check_out_time IS NULL
    AND log_date < CURRENT_DATE;

  RAISE NOTICE 'auto_punch_out: Updated % attendance records.', ROW_COUNT;
END;
$$;

SELECT cron.schedule(
  'auto-punch-out-daily',
  '0 1 * * *',
  'SELECT auto_punch_out_idle_employees()'
);;
