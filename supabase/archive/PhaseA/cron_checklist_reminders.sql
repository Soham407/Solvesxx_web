-- ============================================
-- CRON JOB CONFIGURATION FOR CHECKLIST REMINDERS
-- ============================================
-- 
-- This file contains scheduling options for checklist reminder alerts
--
-- Behavior:
-- - Runs every 30 minutes
-- - Only alerts after shift midpoint (e.g., 4 hours into 8-hour shift)
-- - Only alerts if completion < 50%
-- - One alert per guard per day maximum
--
-- ============================================

-- ============================================
-- OPTION 1: pg_cron (Requires Supabase Pro or Enterprise)
-- ============================================
-- Runs the SQL function every 30 minutes

-- Enable pg_cron extension (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job to check incomplete checklists every 30 minutes
-- This runs more frequently than inactivity checks because checklists 
-- need more frequent monitoring
-- SELECT cron.schedule(
--   'check-incomplete-checklists',  -- job name
--   '*/30 * * * *',                 -- every 30 minutes
--   'SELECT detect_incomplete_checklists(50.00, true);'  -- SQL to execute
-- );

-- Alternative: Run less frequently (every hour)
-- SELECT cron.schedule(
--   'check-incomplete-checklists-hourly',
--   '0 * * * *',                    -- every hour
--   'SELECT detect_incomplete_checklists(50.00, true);'
-- );

-- To view all cron jobs:
-- SELECT * FROM cron.job;

-- To unschedule:
-- SELECT cron.unschedule('check-incomplete-checklists');

-- ============================================
-- OPTION 2: pg_net (HTTP Extension)
-- ============================================
-- Makes HTTP request to Edge Function endpoint

-- Enable pg_net extension
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to trigger Edge Function
CREATE OR REPLACE FUNCTION trigger_checklist_check()
RETURNS void AS $$
DECLARE
    v_response RECORD;
BEGIN
    -- Note: Replace with your actual Supabase project URL and anon key
    SELECT 
        http.status,
        http.content::jsonb
    INTO v_response
    FROM http((
        'POST',
        'https://your-project.supabase.co/functions/v1/check-incomplete-checklists',
        ARRAY[
            http_header('Authorization', 'Bearer your-anon-key'),
            http_header('Content-Type', 'application/json')
        ],
        'application/json',
        '{"threshold": 50, "only_past_midpoint": true}'
    )) AS http;
    
    -- Log the response
    RAISE NOTICE 'Checklist check response: %', v_response;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (uncomment if using this option)
-- SELECT cron.schedule(
--   'trigger-checklist-check',
--   '*/30 * * * *',
--   'SELECT trigger_checklist_check();'
-- );

-- ============================================
-- OPTION 3: Manual External Scheduler
-- ============================================
-- Use this if you don't have access to pg_cron

-- Create a simple HTTP-triggered SQL function
-- that can be called from an external cron service

CREATE OR REPLACE FUNCTION check_checklists_http(
    p_threshold DECIMAL DEFAULT 50.00,
    p_only_past_midpoint BOOLEAN DEFAULT true
)
RETURNS jsonb AS $$
DECLARE
    v_results jsonb;
BEGIN
    -- Call the detection function and return results
    SELECT jsonb_agg(row_to_json(t))
    INTO v_results
    FROM detect_incomplete_checklists(p_threshold, p_only_past_midpoint) t;
    
    RETURN jsonb_build_object(
        'success', true,
        'timestamp', NOW(),
        'config', jsonb_build_object(
            'threshold', p_threshold,
            'only_past_midpoint', p_only_past_midpoint
        ),
        'results', COALESCE(v_results, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SETUP INSTRUCTIONS
-- ============================================

/*

RECOMMENDED APPROACH FOR DEMO:

1. Deploy the Edge Function:
   ```
   supabase functions deploy check-incomplete-checklists
   ```

2. Option A: Use Supabase Dashboard Cron (if available)
   - Go to Database > Cron in Supabase Dashboard
   - Create new job:
     Name: check-incomplete-checklists
     Schedule: */30 * * * *
     Command: SELECT detect_incomplete_checklists(50.00, true);

3. Option B: External Cron Service (Free alternatives):
   
   a) GitHub Actions (Free for public repos):
   ```yaml
   # .github/workflows/checklist-reminder.yml
   name: Check Incomplete Checklists
   on:
     schedule:
       - cron: '*/30 * * * *'  # Every 30 minutes
   jobs:
     check:
       runs-on: ubuntu-latest
       steps:
         - run: |
             curl -X POST "https://your-project.supabase.co/functions/v1/check-incomplete-checklists" \
               -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
               -H "Content-Type: application/json" \
               -d '{"threshold": 50, "only_past_midpoint": true}'
   ```
   
   b) cron-job.org (Free):
   - Sign up at cron-job.org
   - Create new cron job
   - URL: https://your-project.supabase.co/functions/v1/check-incomplete-checklists
   - Schedule: Every 30 minutes
   - Method: POST
   - Body: {"threshold": 50, "only_past_midpoint": true}

4. Option C: Manual Testing (Development only):
   - Call the function directly from SQL Editor:
   ```sql
   SELECT * FROM detect_incomplete_checklists();
   -- Or with parameters:
   SELECT * FROM detect_incomplete_checklists(50.00, false);
   ```
   
   - Or call via curl:
   ```bash
   curl -X POST "https://your-project.supabase.co/functions/v1/check-incomplete-checklists" \
     -H "Authorization: Bearer your-anon-key" \
     -H "Content-Type: application/json" \
     -d '{"threshold": 50, "only_past_midpoint": true}'
   ```

*/

-- ============================================
-- MONITORING & LOGGING
-- ============================================

-- Create a log table for checklist reminders (optional)
CREATE TABLE IF NOT EXISTS checklist_reminder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    guards_checked INTEGER DEFAULT 0,
    incomplete_found INTEGER DEFAULT 0,
    alerts_created INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    threshold_used DECIMAL(5,2),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE checklist_reminder_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view logs
CREATE POLICY "Admins view checklist reminder logs" ON checklist_reminder_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() 
            AND r.role_name::TEXT = 'admin'
        )
    );

-- Function to log checklist check runs
CREATE OR REPLACE FUNCTION log_checklist_check(
    p_guards_checked INTEGER,
    p_incomplete_found INTEGER,
    p_alerts_created INTEGER,
    p_threshold_used DECIMAL(5,2),
    p_execution_time_ms INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO checklist_reminder_logs (
        guards_checked,
        incomplete_found,
        alerts_created,
        threshold_used,
        execution_time_ms,
        error_message
    ) VALUES (
        p_guards_checked,
        p_incomplete_found,
        p_alerts_created,
        p_threshold_used,
        p_execution_time_ms,
        p_error_message
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check checklist completion for all guards:
-- SELECT 
--   g.guard_id,
--   g.guard_name,
--   c.completion_percentage,
--   c.completed_items,
--   c.total_items
-- FROM get_clocked_in_guards() g
-- CROSS JOIN LATERAL get_guard_checklist_completion(g.guard_id) c;

-- View recent checklist reminder alerts:
-- SELECT 
--   pa.id,
--   pa.alert_time,
--   pa.description,
--   pa.is_resolved,
--   sg.guard_code,
--   e.first_name || ' ' || e.last_name as guard_name
-- FROM panic_alerts pa
-- JOIN security_guards sg ON pa.guard_id = sg.id
-- JOIN employees e ON sg.employee_id = e.id
-- WHERE pa.alert_type = 'checklist_incomplete'
-- ORDER BY pa.alert_time DESC
-- LIMIT 10;

-- View check logs:
-- SELECT * FROM checklist_reminder_logs ORDER BY checked_at DESC LIMIT 20;

-- ============================================
-- CUSTOMIZATION OPTIONS
-- ============================================

/*

ADJUST THRESHOLD:
Default is 50% completion. To change:

1. For stricter monitoring (alert at 70%):
   SELECT detect_incomplete_checklists(70.00, true);

2. For lenient monitoring (alert at 30%):
   SELECT detect_incomplete_checklists(30.00, true);

3. No midpoint restriction (alert anytime):
   SELECT detect_incomplete_checklists(50.00, false);

SHIFT-SPECIFIC CONFIGURATION:
You can create different schedules for different shifts:

-- Morning shift (6 AM - 2 PM): Check at 11 AM (after midpoint)
SELECT cron.schedule(
  'checklist-morning',
  '0 11 * * *',
  'SELECT detect_incomplete_checklists(50.00, false);'
);

-- Evening shift (2 PM - 10 PM): Check at 7 PM
SELECT cron.schedule(
  'checklist-evening',
  '0 19 * * *',
  'SELECT detect_incomplete_checklists(50.00, false);'
);

-- Night shift (10 PM - 6 AM): Check at 3 AM
SELECT cron.schedule(
  'checklist-night',
  '0 3 * * *',
  'SELECT detect_incomplete_checklists(50.00, false);'
);

*/
