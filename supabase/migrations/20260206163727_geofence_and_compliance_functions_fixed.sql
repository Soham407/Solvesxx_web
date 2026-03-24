CREATE OR REPLACE FUNCTION detect_geofence_breaches()
RETURNS VOID AS $$
DECLARE
    r RECORD;
    v_latest_lat NUMERIC;
    v_latest_long NUMERIC;
    v_dist NUMERIC;
BEGIN
    -- For each clocked-in guard
    FOR r IN 
        SELECT 
            sg.id as guard_id, 
            cl.latitude as gate_lat, 
            cl.longitude as gate_long, 
            cl.geo_fence_radius,
            cl.id as gate_id
        FROM attendance_logs al
        JOIN security_guards sg ON al.employee_id = sg.employee_id
        JOIN company_locations cl ON al.check_in_location_id = cl.id
        WHERE al.check_out_time IS NULL
        AND al.log_date = CURRENT_DATE
    LOOP
        -- Get latest GPS point
        SELECT latitude, longitude INTO v_latest_lat, v_latest_long
        FROM gps_tracking
        WHERE employee_id = r.guard_id
        ORDER BY tracked_at DESC
        LIMIT 1;
        
        IF v_latest_lat IS NOT NULL THEN
            -- Calc distance
            v_dist := SQRT(POW(v_latest_lat - r.gate_lat, 2) + POW(v_latest_long - r.gate_long, 2)) * 111320;
            
            IF v_dist > r.geo_fence_radius THEN
                -- Breach detected
                -- 1. Insert alert if not already active
                IF NOT EXISTS (
                    SELECT 1 FROM panic_alerts 
                    WHERE guard_id = r.guard_id 
                    AND alert_type = 'geo_fence_breach' 
                    AND is_resolved = false
                    AND alert_time >= NOW() - INTERVAL '15 minutes'
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
                        'geo_fence_breach',
                        r.gate_id,
                        'Geo-fence breach: Guard is away from assigned location.',
                        false,
                        NOW()
                    );
                END IF;
                
                -- 2. Auto-Punch Out if breach exceeds 15 minutes
                IF NOT EXISTS (
                    SELECT 1 FROM gps_tracking 
                    WHERE employee_id = r.guard_id 
                    AND tracked_at >= NOW() - INTERVAL '15 minutes'
                    AND SQRT(POW(latitude - r.gate_lat, 2) + POW(longitude - r.gate_long, 2)) * 111320 <= r.geo_fence_radius
                ) AND EXISTS (
                     SELECT 1 FROM gps_tracking 
                     WHERE employee_id = r.guard_id 
                     AND tracked_at >= NOW() - INTERVAL '15 minutes'
                ) THEN
                    UPDATE attendance_logs 
                    SET 
                        check_out_time = NOW(),
                        status = 'auto_checkout',
                        updated_at = NOW()
                    WHERE employee_id = (SELECT employee_id FROM security_guards WHERE id = r.guard_id)
                    AND check_out_time IS NULL
                    AND log_date = CURRENT_DATE;
                END IF;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_compliance()
RETURNS VOID AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT 
            sg.id as guard_id, 
            e.id as employee_id,
            al.check_in_location_id as location_id
        FROM employee_shift_assignments esa
        JOIN security_guards sg ON esa.employee_id = sg.employee_id
        JOIN employees e ON sg.employee_id = e.id
        JOIN shifts s ON esa.shift_id = s.id
        JOIN attendance_logs al ON al.employee_id = e.id AND al.log_date = CURRENT_DATE
        LEFT JOIN LATERAL (
            SELECT 1 FROM checklist_responses cr 
            WHERE cr.submitted_by_guard_id = sg.id 
            AND cr.created_at::date = CURRENT_DATE
            LIMIT 1
        ) cr_exists ON TRUE
        WHERE esa.is_active = true
        AND s.start_time <= '09:00:00' 
        AND cr_exists IS NULL
        AND al.check_out_time IS NULL
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM panic_alerts 
            WHERE guard_id = r.guard_id 
            AND alert_type = 'checklist_incomplete' 
            AND is_resolved = false
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
                'checklist_incomplete',
                r.location_id,
                'Checklist Compliance Warning: Daily checklist not submitted by 9:00 AM.',
                false,
                NOW()
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
