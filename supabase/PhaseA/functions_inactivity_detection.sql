-- ============================================
-- INACTIVITY DETECTION SYSTEM
-- Detects guards who haven't moved in 15+ minutes
-- ============================================

-- Helper function: Get all currently clocked-in guards
CREATE OR REPLACE FUNCTION get_clocked_in_guards()
RETURNS TABLE (
    employee_id UUID,
    guard_id UUID,
    guard_code VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    location_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as employee_id,
        sg.id as guard_id,
        sg.guard_code,
        e.first_name,
        e.last_name,
        sg.assigned_location_id as location_id
    FROM employees e
    INNER JOIN security_guards sg ON sg.employee_id = e.id
    INNER JOIN attendance_logs al ON al.employee_id = e.id
    WHERE al.log_date = CURRENT_DATE
        AND al.check_in_time IS NOT NULL
        AND al.check_out_time IS NULL
        AND e.is_active = true
        AND sg.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get last GPS position for a guard
CREATE OR REPLACE FUNCTION get_guard_last_position(p_guard_id UUID)
RETURNS TABLE (
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    tracked_at TIMESTAMP WITH TIME ZONE,
    minutes_ago INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gt.latitude,
        gt.longitude,
        gt.tracked_at,
        EXTRACT(MINUTE FROM (NOW() - gt.tracked_at))::INTEGER as minutes_ago
    FROM gps_tracking gt
    WHERE gt.employee_id = p_guard_id
    ORDER BY gt.tracked_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if guard already has active inactivity alert
CREATE OR REPLACE FUNCTION has_active_inactivity_alert(p_guard_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM panic_alerts pa
        WHERE pa.guard_id = p_guard_id
            AND pa.alert_type = 'inactivity'
            AND pa.is_resolved = false
            AND pa.created_at > NOW() - INTERVAL '1 hour'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main function: Detect and create inactivity alerts
CREATE OR REPLACE FUNCTION detect_inactive_guards(p_threshold_minutes INTEGER DEFAULT 15)
RETURNS TABLE (
    guard_id UUID,
    guard_name TEXT,
    minutes_inactive INTEGER,
    alert_created BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_guard RECORD;
    v_last_pos RECORD;
    v_alert_id UUID;
    v_result RECORD;
BEGIN
    -- Loop through all clocked-in guards
    FOR v_guard IN 
        SELECT * FROM get_clocked_in_guards()
    LOOP
        -- Get last known position
        SELECT * INTO v_last_pos 
        FROM get_guard_last_position(v_guard.guard_id);
        
        -- Initialize result
        v_result.guard_id := v_guard.guard_id;
        v_result.guard_name := v_guard.first_name || ' ' || COALESCE(v_guard.last_name, '');
        v_result.minutes_inactive := NULL;
        v_result.alert_created := false;
        v_result.error_message := NULL;
        
        -- Check if position exists and is stale
        IF v_last_pos.tracked_at IS NULL THEN
            -- No GPS data at all for this guard
            v_result.minutes_inactive := 999;
            v_result.error_message := 'No GPS tracking data available';
            
            -- Check if alert already exists
            IF NOT has_active_inactivity_alert(v_guard.guard_id) THEN
                -- Create alert for missing GPS data
                INSERT INTO panic_alerts (
                    guard_id,
                    alert_type,
                    location_id,
                    latitude,
                    longitude,
                    description,
                    is_resolved
                ) VALUES (
                    v_guard.guard_id,
                    'inactivity',
                    v_guard.location_id,
                    NULL,
                    NULL,
                    'Guard has no GPS tracking data. Last known position: Unknown. Possible device issue or location services disabled.',
                    false
                )
                RETURNING id INTO v_alert_id;
                
                IF v_alert_id IS NOT NULL THEN
                    v_result.alert_created := true;
                END IF;
            END IF;
            
        ELSIF v_last_pos.minutes_ago >= p_threshold_minutes THEN
            -- Position is stale (15+ minutes old)
            v_result.minutes_inactive := v_last_pos.minutes_ago;
            v_result.error_message := 'GPS position is stale';
            
            -- Check if alert already exists
            IF NOT has_active_inactivity_alert(v_guard.guard_id) THEN
                -- Create alert
                INSERT INTO panic_alerts (
                    guard_id,
                    alert_type,
                    location_id,
                    latitude,
                    longitude,
                    description,
                    is_resolved
                ) VALUES (
                    v_guard.guard_id,
                    'inactivity',
                    v_guard.location_id,
                    v_last_pos.latitude,
                    v_last_pos.longitude,
                    'Guard has been inactive for ' || v_last_pos.minutes_ago || ' minutes. Last known position recorded at ' || v_last_pos.tracked_at::TEXT || '. Possible stationary guard, sleeping on duty, or emergency situation.',
                    false
                )
                RETURNING id INTO v_alert_id;
                
                IF v_alert_id IS NOT NULL THEN
                    v_result.alert_created := true;
                END IF;
            END IF;
        END IF;
        
        -- Return result if there's something to report
        IF v_result.minutes_inactive IS NOT NULL THEN
            RETURN QUERY SELECT 
                v_result.guard_id,
                v_result.guard_name,
                v_result.minutes_inactive,
                v_result.alert_created,
                v_result.error_message;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ENABLE EXECUTION PERMISSIONS
-- ============================================

-- Grant execute permission to authenticated users (for Edge Function)
GRANT EXECUTE ON FUNCTION get_clocked_in_guards() TO authenticated;
GRANT EXECUTE ON FUNCTION get_guard_last_position(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_inactivity_alert(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_inactive_guards(INTEGER) TO authenticated;

-- Grant execute to service role (for Edge Function)
GRANT EXECUTE ON FUNCTION get_clocked_in_guards() TO service_role;
GRANT EXECUTE ON FUNCTION get_guard_last_position(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION has_active_inactivity_alert(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION detect_inactive_guards(INTEGER) TO service_role;

-- ============================================
-- MANUAL TESTING
-- ============================================
--
-- To test the detection manually:
--
-- 1. View clocked-in guards:
-- SELECT * FROM get_clocked_in_guards();
--
-- 2. Check last position for a specific guard:
-- SELECT * FROM get_guard_last_position('guard-uuid-here');
--
-- 3. Run full detection (15 minute threshold):
-- SELECT * FROM detect_inactive_guards(15);
--
-- 4. Check created alerts:
-- SELECT * FROM panic_alerts WHERE alert_type = 'inactivity' ORDER BY created_at DESC;
--
-- ============================================
