CREATE OR REPLACE FUNCTION get_guard_movement_variance(p_guard_id UUID, p_duration_minutes INT DEFAULT 30)
RETURNS NUMERIC AS $$
DECLARE
    v_max_dist NUMERIC := 0;
BEGIN
    -- Rough displacement in meters
    WITH points AS (
        SELECT latitude, longitude
        FROM gps_tracking
        WHERE employee_id = p_guard_id
        AND tracked_at >= NOW() - (p_duration_minutes || ' minutes')::interval
    )
    SELECT 
        SQRT(POW(MAX(latitude) - MIN(latitude), 2) + POW(MAX(longitude) - MIN(longitude), 2)) * 111320
    INTO v_max_dist
    FROM points;
    
    RETURN COALESCE(v_max_dist, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION detect_stationary_guards()
RETURNS VOID AS $$
DECLARE
    r RECORD;
    v_variance NUMERIC;
    v_threshold NUMERIC := 20; -- 20 meters
BEGIN
    -- For each clocked-in guard
    FOR r IN 
        SELECT sg.id as guard_id, sg.employee_id, al.check_in_location_id
        FROM attendance_logs al
        JOIN security_guards sg ON al.employee_id = sg.employee_id
        WHERE al.check_out_time IS NULL
        AND al.log_date = CURRENT_DATE
    LOOP
        v_variance := get_guard_movement_variance(r.guard_id, 30);
        
        -- Check if we have at least some points in the last 30 mins to avoid false alerts on start
        IF v_variance < v_threshold AND EXISTS (
            SELECT 1 FROM gps_tracking 
            WHERE employee_id = r.guard_id 
            AND tracked_at >= NOW() - INTERVAL '30 minutes'
        ) THEN
            -- Check if we already have an unresolved inactivity alert for this guard in the last hour
            IF NOT EXISTS (
                SELECT 1 FROM panic_alerts 
                WHERE guard_id = r.guard_id 
                AND alert_type = 'inactivity' 
                AND is_resolved = false
                AND alert_time >= NOW() - INTERVAL '1 hour'
            ) THEN
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
                    'Stationary alert: Guard has not moved significantly for 30 minutes.',
                    false,
                    NOW()
                );
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
