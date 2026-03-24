-- ============================================
-- PHASE 4: AUTOMATION, CRON & CONNECTIVITY
-- Automated Schedules and background monitoring
-- ============================================

-- 1. Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 2. Optimized SQL: Detect Inactive Guards
-- Checks for lack of movement or GPS heartbeat
CREATE OR REPLACE FUNCTION detect_inactive_guards(p_threshold_minutes INT DEFAULT 15)
RETURNS TABLE (out_guard_id UUID, out_alert_created BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    v_alert_id UUID;
BEGIN
    -- For each guard currently clocked in
    FOR r IN 
        SELECT sg.id as guard_id, sg.employee_id, al.check_in_location_id, e.first_name || ' ' || e.last_name as guard_name
        FROM attendance_logs al
        JOIN employees e ON al.employee_id = e.id
        JOIN security_guards sg ON e.id = sg.employee_id
        WHERE al.check_out_time IS NULL
        AND al.log_date = CURRENT_DATE
    LOOP
        -- Check if no movement in p_threshold_minutes
        IF NOT EXISTS (
            SELECT 1 FROM gps_tracking 
            WHERE employee_id = r.employee_id 
            AND tracked_at >= (NOW() - (p_threshold_minutes || ' minutes')::INTERVAL)
        ) THEN
            -- Check if we already have an unresolved inactivity alert for this guard in the last hour
            IF NOT EXISTS (
                SELECT 1 FROM panic_alerts 
                WHERE guard_id = r.guard_id 
                AND alert_type = 'inactivity' 
                AND is_resolved = false
                AND alert_time >= NOW() - INTERVAL '1 hour'
            ) THEN
                -- Insert Panic Alert
                INSERT INTO panic_alerts (
                    guard_id,
                    alert_type,
                    location_id,
                    description,
                    is_resolved,
                    alert_time
                ) VALUES (
                    r.guard_id,
                    'inactivity',
                    r.check_in_location_id,
                    'Inactivity detected: No GPS heartbeat for ' || p_threshold_minutes || ' minutes.',
                    false,
                    NOW()
                ) RETURNING id INTO v_alert_id;
                
                -- Create a high-priority notification for supervisors
                INSERT INTO notifications (
                    user_id,
                    notification_type,
                    title,
                    message,
                    reference_type,
                    reference_id,
                    priority
                )
                SELECT 
                    u.id,
                    'inactivity_alert',
                    'Guard Inactivity Warning',
                    'Guard ' || r.guard_name || ' has not updated GPS location for ' || p_threshold_minutes || 'm.',
                    'panic_alert',
                    v_alert_id,
                    'high'
                FROM users u
                JOIN roles rl ON u.role_id = rl.id
                WHERE rl.role_name::text IN ('admin', 'security_supervisor');
                
                out_guard_id := r.guard_id;
                out_alert_created := true;
                RETURN NEXT;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 3. Optimized SQL: Detect Incomplete Checklists
-- Reminders for guards who are active but haven't submitted checklists
CREATE OR REPLACE FUNCTION detect_incomplete_checklists()
RETURNS TABLE (out_employee_id UUID, out_alert_created BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT e.id as employee_id, e.first_name || ' ' || e.last_name as guard_name
        FROM attendance_logs al
        JOIN employees e ON al.employee_id = e.id
        JOIN users u ON u.employee_id = e.id
        JOIN roles rl ON u.role_id = rl.id
        WHERE al.check_out_time IS NULL
        AND al.log_date = CURRENT_DATE
        AND rl.role_name::text = 'security_guard'
        AND NOT EXISTS (
            SELECT 1 FROM checklist_responses cr 
            WHERE cr.employee_id = e.id 
            AND cr.response_date = CURRENT_DATE
        )
        -- Only remind if shift has progressed (e.g., after 11 AM)
        AND EXTRACT(HOUR FROM NOW()) >= 11
    LOOP
        -- Create notification for the guard
        INSERT INTO notifications (
            user_id,
            notification_type,
            title,
            message,
            priority
        )
        SELECT 
            u.id,
            'checklist_reminder',
            'Checklist Pending',
            'You haven''t started your daily safety checklist yet. Please complete it at the earliest.',
            'normal'
        FROM users u
        WHERE u.employee_id = r.employee_id;
        
        out_employee_id := r.employee_id;
        out_alert_created := true;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- 4. Setup Cron Jobs
-- Usage of unschedule might fail if job doesn't exist, safely handle it
DO $$
BEGIN
    PERFORM cron.unschedule('check-guard-heartbeat');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule('check-guard-heartbeat', '*/15 * * * *', 'SELECT detect_inactive_guards()');

DO $$
BEGIN
    PERFORM cron.unschedule('daily-compliance-check');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule('daily-compliance-check', '0 8 * * *', 'SELECT process_overdue_alerts()');

DO $$
BEGIN
    PERFORM cron.unschedule('checklist-reminders');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule('checklist-reminders', '30 * * * *', 'SELECT detect_incomplete_checklists()');
;
