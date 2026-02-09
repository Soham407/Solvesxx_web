-- ============================================
-- CRON JOB CONFIGURATION FOR INACTIVITY DETECTION
-- ============================================
-- 
-- This file contains multiple scheduling options.
-- Choose the one that works best for your Supabase setup:
--
-- Option 1: pg_cron (Recommended if available on your Supabase plan)
-- Option 2: pg_net extension (HTTP extension)
-- Option 3: External scheduler (manual setup instructions)
--
-- ============================================

-- ============================================
-- OPTION 1: pg_cron (Requires Supabase Pro or Enterprise)
-- ============================================
-- Runs the SQL function directly every 5 minutes

-- Enable pg_cron extension (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job to detect inactive guards every 5 minutes
-- This calls the SQL function directly (most efficient)
-- SELECT cron.schedule(
--   'check-guard-inactivity',  -- job name
--   '*/5 * * * *',            -- every 5 minutes
--   'SELECT detect_inactive_guards(15);'  -- SQL to execute
-- );

-- To view all cron jobs:
-- SELECT * FROM cron.job;

-- To unschedule:
-- SELECT cron.unschedule('check-guard-inactivity');

-- ============================================
-- OPTION 2: pg_net (HTTP Extension)
-- ============================================
-- Makes HTTP request to Edge Function endpoint
-- Requires pg_net extension and the Edge Function to be deployed

-- Enable pg_net extension
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to trigger Edge Function
CREATE OR REPLACE FUNCTION trigger_inactivity_check()
RETURNS void AS $$
DECLARE
    v_response RECORD;
BEGIN
    -- Note: Replace with your actual Supabase project URL and anon key
    -- This is a template - you'll need to update with real values
    SELECT 
        http.status,
        http.content::jsonb
    INTO v_response
    FROM http((
        'POST',
        'https://your-project.supabase.co/functions/v1/check-guard-inactivity',
        ARRAY[
            http_header('Authorization', 'Bearer your-anon-key'),
            http_header('Content-Type', 'application/json')
        ],
        'application/json',
        '{}'
    )) AS http;
    
    -- Log the response
    RAISE NOTICE 'Inactivity check response: %', v_response;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (uncomment if using this option)
-- SELECT cron.schedule(
--   'trigger-inactivity-check',
--   '*/5 * * * *',
--   'SELECT trigger_inactivity_check();'
-- );

-- ============================================
-- OPTION 3: Manual External Scheduler
-- ============================================
-- Use this if you don't have access to pg_cron

-- Create a simple HTTP-triggered SQL function
-- that can be called from an external cron service

CREATE OR REPLACE FUNCTION check_inactivity_http()
RETURNS jsonb AS $$
DECLARE
    v_results jsonb;
BEGIN
    -- Call the detection function and return results
    SELECT jsonb_agg(row_to_json(t))
    INTO v_results
    FROM detect_inactive_guards(15) t;
    
    RETURN jsonb_build_object(
        'success', true,
        'timestamp', NOW(),
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
   supabase functions deploy check-guard-inactivity
   ```

2. Option A: Use Supabase Dashboard Cron (if available)
   - Go to Database > Cron in Supabase Dashboard
   - Create new job:
     Name: check-guard-inactivity
     Schedule: */5 * * * *
     Command: SELECT detect_inactive_guards(15);

3. Option B: External Cron Service (Free alternatives):
   
   a) GitHub Actions (Free for public repos):
   ```yaml
   # .github/workflows/inactivity-check.yml
   name: Check Guard Inactivity
   on:
     schedule:
       - cron: '*/5 * * * *'  # Every 5 minutes
   jobs:
     check:
       runs-on: ubuntu-latest
       steps:
         - run: |
             curl -X POST "https://your-project.supabase.co/functions/v1/check-guard-inactivity" \
               -H "Authorization: Bearer $SUPABASE_ANON_KEY"
   ```
   
   b) cron-job.org (Free):
   - Sign up at cron-job.org
   - Create new cron job
   - URL: https://your-project.supabase.co/functions/v1/check-guard-inactivity
   - Schedule: Every 5 minutes
   
   c) UptimeRobot (Free tier):
   - Add monitor with POST request
   - Set interval to 5 minutes

4. Option C: Manual Testing (Development only):
   - Call the function directly from SQL Editor:
   ```sql
   SELECT * FROM detect_inactive_guards(15);
   ```
   
   - Or call via curl:
   ```bash
   curl -X POST "https://your-project.supabase.co/functions/v1/check-guard-inactivity" \
     -H "Authorization: Bearer your-anon-key"
   ```

*/

-- ============================================
-- MONITORING & LOGGING
-- ============================================

-- Create a simple log table for tracking (optional)
CREATE TABLE IF NOT EXISTS inactivity_check_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    guards_checked INTEGER DEFAULT 0,
    inactive_found INTEGER DEFAULT 0,
    alerts_created INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE inactivity_check_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view logs
CREATE POLICY "Admins view inactivity logs" ON inactivity_check_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() 
            AND r.role_name::TEXT = 'admin'
        )
    );

-- Function to log inactivity check runs
CREATE OR REPLACE FUNCTION log_inactivity_check(
    p_guards_checked INTEGER,
    p_inactive_found INTEGER,
    p_alerts_created INTEGER,
    p_execution_time_ms INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO inactivity_check_logs (
        guards_checked,
        inactive_found,
        alerts_created,
        execution_time_ms,
        error_message
    ) VALUES (
        p_guards_checked,
        p_inactive_found,
        p_alerts_created,
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

-- Check if inactivity detection is working:
-- SELECT * FROM detect_inactive_guards(15);

-- View recent inactivity alerts:
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
-- WHERE pa.alert_type = 'inactivity'
-- ORDER BY pa.alert_time DESC
-- LIMIT 10;

-- View check logs:
-- SELECT * FROM inactivity_check_logs ORDER BY checked_at DESC LIMIT 20;
