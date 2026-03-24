
CREATE FUNCTION public.check_geofence(
    p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION,
    p_site_lat DOUBLE PRECISION, p_site_lng DOUBLE PRECISION,
    p_radius_meters DOUBLE PRECISION
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_distance DOUBLE PRECISION;
BEGIN
    SELECT (6371000 * acos(LEAST(1.0,
        cos(radians(p_lat)) * cos(radians(p_site_lat)) *
        cos(radians(p_site_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(p_site_lat))
    ))) INTO v_distance;
    RETURN v_distance <= p_radius_meters;
END;
$$;

CREATE FUNCTION public.get_clocked_in_guards()
RETURNS TABLE(
    employee_id UUID, guard_id UUID, guard_code VARCHAR,
    first_name VARCHAR, last_name VARCHAR, location_id UUID, shift_id UUID
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, sg.id, sg.guard_code, e.first_name, e.last_name,
           sg.assigned_location_id, esa.shift_id
    FROM employees e
    INNER JOIN security_guards sg ON sg.employee_id = e.id
    INNER JOIN attendance_logs al ON al.employee_id = e.id
    LEFT JOIN employee_shift_assignments esa ON esa.employee_id = e.id AND esa.is_active = true
    WHERE al.log_date = CURRENT_DATE
        AND al.check_in_time IS NOT NULL AND al.check_out_time IS NULL
        AND e.is_active = true AND sg.is_active = true;
END;
$$;

CREATE FUNCTION public.get_guard_last_position(p_guard_id UUID)
RETURNS TABLE(latitude NUMERIC, longitude NUMERIC, tracked_at TIMESTAMPTZ, minutes_ago INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT gt.latitude, gt.longitude, gt.tracked_at,
           (EXTRACT(EPOCH FROM (NOW() - gt.tracked_at)) / 60)::INTEGER
    FROM gps_tracking gt WHERE gt.employee_id = p_guard_id
    ORDER BY gt.tracked_at DESC LIMIT 1;
END;
$$;

CREATE FUNCTION public.has_active_checklist_alert(p_guard_id UUID, p_date DATE)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM panic_alerts pa
        WHERE pa.guard_id = p_guard_id AND pa.alert_type = 'checklist_incomplete'
            AND pa.is_resolved = false AND pa.created_at::DATE = p_date
    );
END;
$$;

CREATE FUNCTION public.has_active_inactivity_alert(p_guard_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM panic_alerts pa
        WHERE pa.guard_id = p_guard_id AND pa.alert_type = 'inactivity'
            AND pa.is_resolved = false AND pa.created_at > NOW() - INTERVAL '1 hour'
    );
END;
$$;

CREATE FUNCTION public.get_shift_time_info(p_shift_id UUID)
RETURNS TABLE(
    shift_name VARCHAR, start_time TIME, end_time TIME,
    midpoint TIME, minutes_remaining INTEGER, is_past_midpoint BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_name VARCHAR; v_start TIME; v_end TIME; v_midpoint TIME;
    v_now TIME := CURRENT_TIME; v_mins INTEGER;
BEGIN
    SELECT s.shift_name, s.start_time::TIME, s.end_time::TIME
    INTO v_name, v_start, v_end FROM shifts s WHERE s.id = p_shift_id;
    IF v_start IS NULL THEN RETURN; END IF;
    v_midpoint := v_start + ((v_end - v_start) / 2);
    IF v_end > v_start THEN
        v_mins := (EXTRACT(EPOCH FROM (v_end - v_now)) / 60)::INTEGER;
    ELSIF v_now > v_start THEN
        v_mins := (EXTRACT(EPOCH FROM ('24:00:00'::INTERVAL - v_now + v_end)) / 60)::INTEGER;
    ELSE
        v_mins := (EXTRACT(EPOCH FROM (v_end - v_now)) / 60)::INTEGER;
    END IF;
    RETURN QUERY SELECT v_name, v_start, v_end, v_midpoint, GREATEST(v_mins,0), (v_now > v_midpoint);
END;
$$;

CREATE FUNCTION public.detect_expiring_items(p_days_ahead INTEGER DEFAULT 30)
RETURNS TABLE(item_id UUID, item_name TEXT, item_type TEXT, days_left INTEGER, severity TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT et.item_id::UUID, et.item_name, et.item_type,
           (et.expiry_date - CURRENT_DATE)::INT,
           CASE WHEN (et.expiry_date - CURRENT_DATE) <= 3 THEN 'critical'
                WHEN (et.expiry_date - CURRENT_DATE) <= 7 THEN 'warning'
                ELSE 'info' END::TEXT
    FROM expiry_tracking et
    WHERE et.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days_ahead);
END;
$$;

CREATE FUNCTION public.get_shift_checklist_items(p_shift_id UUID)
RETURNS TABLE(item_id UUID, task_name VARCHAR, category VARCHAR,
              priority INTEGER, requires_photo BOOLEAN, requires_signature BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT dci.id, dci.task_name, dci.category, dci.priority,
           dci.requires_photo, dci.requires_signature
    FROM daily_checklist_items dci
    WHERE dci.shift_id = p_shift_id AND dci.is_active = true
    ORDER BY dci.priority, dci.task_name;
END;
$$;

CREATE FUNCTION public.get_guard_checklist_completion(p_guard_id UUID, p_checklist_date DATE)
RETURNS TABLE(
    total_items INTEGER, completed_items INTEGER,
    completion_percentage DECIMAL(5,2), pending_items JSONB, last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_shift_id UUID; v_employee_id UUID;
    v_total INTEGER; v_completed INTEGER; v_pending JSONB; v_last_updated TIMESTAMPTZ;
BEGIN
    SELECT sg.employee_id INTO v_employee_id FROM security_guards sg WHERE sg.id = p_guard_id;
    SELECT esa.shift_id INTO v_shift_id FROM employee_shift_assignments esa
    WHERE esa.employee_id = v_employee_id AND esa.is_active = true LIMIT 1;

    IF v_shift_id IS NULL THEN
        RETURN QUERY SELECT 0, 0, 0.00::DECIMAL(5,2), '[]'::JSONB, NULL::TIMESTAMPTZ; RETURN;
    END IF;

    SELECT COUNT(*)::INTEGER INTO v_total
    FROM daily_checklist_items dci WHERE dci.shift_id = v_shift_id AND dci.is_active = true;

    SELECT COUNT(*)::INTEGER, MAX(cr.submitted_at) INTO v_completed, v_last_updated
    FROM checklist_responses cr
    WHERE cr.employee_id = v_employee_id AND cr.response_date = p_checklist_date AND cr.is_complete = true;

    SELECT jsonb_agg(jsonb_build_object(
        'item_id', dci.id, 'task_name', dci.task_name,
        'category', dci.category, 'priority', dci.priority
    )) INTO v_pending
    FROM daily_checklist_items dci
    WHERE dci.shift_id = v_shift_id AND dci.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM checklist_responses cr
            WHERE cr.employee_id = v_employee_id AND cr.response_date = p_checklist_date
                AND cr.is_complete = true AND cr.checklist_id = dci.checklist_id
        );

    RETURN QUERY SELECT
        COALESCE(v_total,0), COALESCE(v_completed,0),
        CASE WHEN COALESCE(v_total,0) > 0
             THEN ROUND((COALESCE(v_completed,0)::DECIMAL / v_total)*100, 2)
             ELSE 0.00 END::DECIMAL(5,2),
        COALESCE(v_pending,'[]'::JSONB), v_last_updated;
END;
$$;

CREATE FUNCTION public.detect_incomplete_checklists()
RETURNS TABLE(out_employee_id UUID, out_alert_created BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT e.id AS employee_id
        FROM attendance_logs al
        JOIN employees e ON al.employee_id = e.id
        JOIN users u ON u.employee_id = e.id
        JOIN roles rl ON u.role_id = rl.id
        WHERE al.check_out_time IS NULL AND al.log_date = CURRENT_DATE
            AND rl.role_name::text = 'security_guard'
            AND NOT EXISTS (
                SELECT 1 FROM checklist_responses cr
                WHERE cr.employee_id = e.id AND cr.response_date = CURRENT_DATE AND cr.is_complete = true
            )
            AND EXTRACT(HOUR FROM NOW()) >= 11
    LOOP
        INSERT INTO notifications (user_id, notification_type, title, message, priority)
        SELECT u.id, 'checklist_reminder', 'Checklist Pending',
               'You haven''t completed your daily safety checklist. Please complete it now.', 'normal'
        FROM users u WHERE u.employee_id = r.employee_id;
        out_employee_id := r.employee_id; out_alert_created := true; RETURN NEXT;
    END LOOP;
END;
$$;

CREATE FUNCTION public.detect_incomplete_checklists(
    p_completion_threshold NUMERIC DEFAULT 50, p_only_past_midpoint BOOLEAN DEFAULT true
)
RETURNS TABLE(
    guard_id UUID, guard_name TEXT, shift_name VARCHAR,
    completion_percentage DECIMAL(5,2), total_items INTEGER,
    completed_items INTEGER, minutes_remaining INTEGER,
    alert_created BOOLEAN, error_message TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_guard RECORD; v_completion RECORD; v_shift_info RECORD; v_alert_id UUID;
BEGIN
    FOR v_guard IN SELECT * FROM get_clocked_in_guards()
    LOOP
        SELECT * INTO v_completion FROM get_guard_checklist_completion(v_guard.guard_id, CURRENT_DATE);
        SELECT * INTO v_shift_info FROM get_shift_time_info(v_guard.shift_id);

        IF COALESCE(v_completion.total_items,0) = 0 THEN
            RETURN QUERY SELECT v_guard.guard_id,
                (v_guard.first_name||' '||COALESCE(v_guard.last_name,''))::TEXT,
                v_shift_info.shift_name, 0.00::DECIMAL(5,2), 0, 0,
                COALESCE(v_shift_info.minutes_remaining,0), false,
                'No checklist items configured'::TEXT;
            CONTINUE;
        END IF;
        CONTINUE WHEN v_completion.completion_percentage >= 100;
        CONTINUE WHEN v_completion.completion_percentage >= p_completion_threshold;
        CONTINUE WHEN p_only_past_midpoint AND NOT COALESCE(v_shift_info.is_past_midpoint,false);
        CONTINUE WHEN has_active_checklist_alert(v_guard.guard_id, CURRENT_DATE);

        INSERT INTO panic_alerts (guard_id, alert_type, location_id, description, is_resolved)
        VALUES (v_guard.guard_id, 'checklist_incomplete', v_guard.location_id,
            'Incomplete: '||v_completion.completion_percentage||'% ('||
            v_completion.completed_items||'/'||v_completion.total_items||' items). '||
            COALESCE(v_shift_info.minutes_remaining::TEXT,'?')||' mins left.', false)
        RETURNING id INTO v_alert_id;

        RETURN QUERY SELECT v_guard.guard_id,
            (v_guard.first_name||' '||COALESCE(v_guard.last_name,''))::TEXT,
            v_shift_info.shift_name, v_completion.completion_percentage,
            v_completion.total_items, v_completion.completed_items,
            COALESCE(v_shift_info.minutes_remaining,0), (v_alert_id IS NOT NULL), NULL::TEXT;
    END LOOP;
END;
$$;

CREATE FUNCTION public.trigger_checklist_check()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_response RECORD;
BEGIN
    SELECT http.status, http.content::jsonb INTO v_response
    FROM http(('POST',
        'https://wwhbdgwfodumognpkgrf.supabase.co/functions/v1/check-incomplete-checklists',
        ARRAY[
            http_header('Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3aGJkZ3dmb2R1bW9nbnBrZ3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzYyOTgsImV4cCI6MjA4NTcxMjI5OH0.Iw5KYmIP_OHalA2tyHAiKSI6xQa-EE5urL_4aEygzg0'),
            http_header('Content-Type','application/json'),
            http_header('x-internal-api-key','CRON_SECURE_KEY_8823')
        ], 'application/json', '{"threshold":50,"only_past_midpoint":true}'
    )) AS http;
    RAISE NOTICE 'Checklist check: %', v_response;
END;
$$;

CREATE FUNCTION public.trigger_inactivity_check()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_response RECORD;
BEGIN
    SELECT http.status, http.content::jsonb INTO v_response
    FROM http(('POST',
        'https://wwhbdgwfodumognpkgrf.supabase.co/functions/v1/check-guard-inactivity',
        ARRAY[
            http_header('Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3aGJkZ3dmb2R1bW9nbnBrZ3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzYyOTgsImV4cCI6MjA4NTcxMjI5OH0.Iw5KYmIP_OHalA2tyHAiKSI6xQa-EE5urL_4aEygzg0'),
            http_header('Content-Type','application/json'),
            http_header('x-internal-api-key','CRON_SECURE_KEY_8823')
        ], 'application/json', '{}'
    )) AS http;
    RAISE NOTICE 'Inactivity check: %', v_response;
END;
$$;

CREATE FUNCTION public.validate_bill_for_payout(p_bill_id UUID)
RETURNS TABLE(is_valid BOOLEAN, message TEXT, match_status TEXT,
              po_total NUMERIC, grn_total NUMERIC, bill_total NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_bill_total NUMERIC; v_match_status TEXT; v_payment_status TEXT;
    v_po_id UUID; v_grn_id UUID; v_po_total NUMERIC; v_grn_total NUMERIC;
BEGIN
    SELECT (pb.total_amount/100.0), pb.match_status, pb.payment_status,
           pb.purchase_order_id, pb.material_receipt_id
    INTO v_bill_total, v_match_status, v_payment_status, v_po_id, v_grn_id
    FROM purchase_bills pb WHERE pb.id = p_bill_id;

    SELECT (po.grand_total/100.0) INTO v_po_total FROM purchase_orders po WHERE po.id = v_po_id;
    SELECT (mr.total_received_value/100.0) INTO v_grn_total FROM material_receipts mr WHERE mr.id = v_grn_id;

    IF v_payment_status = 'paid' THEN
        RETURN QUERY SELECT false, 'Bill is already fully paid.'::TEXT,
            v_match_status, v_po_total, v_grn_total, v_bill_total;
    ELSIF v_match_status IN ('matched','force_matched') THEN
        RETURN QUERY SELECT true, 'Bill is valid for payout.'::TEXT,
            v_match_status, v_po_total, v_grn_total, v_bill_total;
    ELSE
        RETURN QUERY SELECT false,
            'Reconciliation mismatch. Requires manual Force Match by Finance Admin.'::TEXT,
            v_match_status, v_po_total, v_grn_total, v_bill_total;
    END IF;
END;
$$;
;
