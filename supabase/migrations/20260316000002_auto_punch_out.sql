-- Auto Punch-Out Cron Job
-- Automatically closes open attendance records from previous days to prevent payroll errors.
-- Guards and employees who forget to punch out will get an automatic checkout at 23:59:59 of that day.

-- Function to auto-punch-out employees who forgot to check out
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

  -- Log how many records were updated
  RAISE NOTICE 'auto_punch_out: Updated % attendance records.', ROW_COUNT;
END;
$$;

-- Schedule: Run daily at 1:00 AM (after midnight, catches previous day's missed checkouts)
-- Requires pg_cron extension (already enabled in Phase E automated_schedules)
SELECT cron.schedule(
  'auto-punch-out-daily',
  '0 1 * * *',
  'SELECT auto_punch_out_idle_employees()'
);
