
-- Function to call the check-checklist edge function (shift-end reminder, runs hourly)
CREATE OR REPLACE FUNCTION public.trigger_shift_end_checklist_reminder()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_response RECORD;
    v_service_role_key TEXT;
BEGIN
    v_service_role_key := current_setting('app.settings.service_role_key', true);

    SELECT http.status, http.content::jsonb INTO v_response
    FROM http(('POST',
        'https://wwhbdgwfodumognpkgrf.supabase.co/functions/v1/check-checklist',
        ARRAY[
            http_header('Authorization', 'Bearer ' || v_service_role_key),
            http_header('Content-Type', 'application/json')
        ], 'application/json', '{}'
    )) AS http;

    RAISE NOTICE 'check-checklist: %', v_response;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'check-checklist failed: %', SQLERRM;
END;
$$;

-- Schedule hourly (every hour at :00)
SELECT cron.schedule(
    'trigger-shift-end-checklist-reminder',
    '0 * * * *',
    'SELECT trigger_shift_end_checklist_reminder();'
);
;
