-- ============================================
-- CHECKLIST REMINDER SYSTEM
-- Detects guards with incomplete daily checklists
-- ============================================

-- Helper function: Get daily checklist items for a shift
CREATE OR REPLACE FUNCTION get_shift_checklist_items(p_shift_id UUID)
RETURNS TABLE (
    item_id UUID,
    task_name VARCHAR(200),
    category VARCHAR(50),
    priority INTEGER,
    requires_photo BOOLEAN,
    requires_signature BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dci.id as item_id,
        dci.task_name,
        dci.category,
        dci.priority,
        dci.requires_photo,
        dci.requires_signature
    FROM daily_checklist_items dci
    WHERE dci.shift_id = p_shift_id
        AND dci.is_active = true
    ORDER BY dci.priority, dci.task_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get today's checklist completion for a guard
CREATE OR REPLACE FUNCTION get_guard_checklist_completion(p_guard_id UUID, p_checklist_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    total_items INTEGER,
    completed_items INTEGER,
    completion_percentage DECIMAL(5,2),
    pending_items JSONB,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_shift_id UUID;
    v_total INTEGER;
    v_completed INTEGER;
    v_pending JSONB;
    v_last_updated TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get guard's current shift
    SELECT sg.shift_id INTO v_shift_id
    FROM security_guards sg
    WHERE sg.id = p_guard_id;
    
    IF v_shift_id IS NULL THEN
        RETURN QUERY SELECT 
            0::INTEGER,
            0::INTEGER,
            0.00::DECIMAL(5,2),
            '[]'::JSONB,
            NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Count total items for this shift
    SELECT COUNT(*) INTO v_total
    FROM daily_checklist_items dci
    WHERE dci.shift_id = v_shift_id
        AND dci.is_active = true;
    
    -- Count completed items for today
    SELECT 
        COUNT(*),
        MAX(cr.updated_at)
    INTO v_completed, v_last_updated
    FROM checklist_responses cr
    WHERE cr.employee_id = (
        SELECT employee_id FROM security_guards WHERE id = p_guard_id
    )
        AND cr.checklist_date = p_checklist_date
        AND cr.is_complete = true;
    
    -- Get pending items
    SELECT jsonb_agg(
        jsonb_build_object(
            'item_id', dci.id,
            'task_name', dci.task_name,
            'category', dci.category,
            'priority', dci.priority
        )
    ) INTO v_pending
    FROM daily_checklist_items dci
    WHERE dci.shift_id = v_shift_id
        AND dci.is_active = true
        AND NOT EXISTS (
            SELECT 1 
            FROM checklist_responses cr
            WHERE cr.item_id = dci.id
                AND cr.employee_id = (
                    SELECT employee_id FROM security_guards WHERE id = p_guard_id
                )
                AND cr.checklist_date = p_checklist_date
                AND cr.is_complete = true
        );
    
    IF v_pending IS NULL THEN
        v_pending := '[]'::JSONB;
    END IF;
    
    RETURN QUERY SELECT 
        v_total,
        COALESCE(v_completed, 0),
        CASE 
            WHEN v_total > 0 THEN ROUND((COALESCE(v_completed, 0)::DECIMAL / v_total::DECIMAL) * 100, 2)
            ELSE 0.00
        END::DECIMAL(5,2),
        v_pending,
        v_last_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if guard already has active checklist alert today
CREATE OR REPLACE FUNCTION has_active_checklist_alert(p_guard_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM panic_alerts pa
        WHERE pa.guard_id = p_guard_id
            AND pa.alert_type = 'checklist_incomplete'
            AND pa.is_resolved = false
            AND pa.created_at::DATE = p_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get shift time info
CREATE OR REPLACE FUNCTION get_shift_time_info(p_shift_id UUID)
RETURNS TABLE (
    shift_name VARCHAR(100),
    start_time TIME,
    end_time TIME,
    midpoint_time TIME,
    minutes_remaining INTEGER,
    is_past_midpoint BOOLEAN
) AS $$
DECLARE
    v_start TIME;
    v_end TIME;
    v_midpoint TIME;
    v_now TIME := CURRENT_TIME;
    v_minutes_remaining INTEGER;
    v_is_past_midpoint BOOLEAN;
BEGIN
    SELECT 
        s.shift_name,
        s.start_time::TIME,
        s.end_time::TIME
    INTO 
        shift_name,
        v_start,
        v_end
    FROM shifts s
    WHERE s.id = p_shift_id;
    
    IF v_start IS NULL THEN
        RETURN;
    END IF;
    
    -- Calculate midpoint
    v_midpoint := v_start + ((v_end - v_start) / 2);
    
    -- Calculate minutes remaining
    IF v_end > v_start THEN
        -- Same day shift
        v_minutes_remaining := EXTRACT(EPOCH FROM (v_end - v_now)) / 60;
    ELSE
        -- Overnight shift
        IF v_now > v_start THEN
            v_minutes_remaining := EXTRACT(EPOCH FROM ('24:00:00'::TIME - v_now + v_end)) / 60;
        ELSE
            v_minutes_remaining := EXTRACT(EPOCH FROM (v_end - v_now)) / 60;
        END IF;
    END IF;
    
    v_is_past_midpoint := v_now > v_midpoint;
    
    RETURN QUERY SELECT 
        shift_name,
        v_start,
        v_end,
        v_midpoint,
        GREATEST(v_minutes_remaining, 0)::INTEGER,
        v_is_past_midpoint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main function: Detect and create checklist reminder alerts
CREATE OR REPLACE FUNCTION detect_incomplete_checklists(
    p_completion_threshold DECIMAL(5,2) DEFAULT 50.00,
    p_only_past_midpoint BOOLEAN DEFAULT true
)
RETURNS TABLE (
    guard_id UUID,
    guard_name TEXT,
    shift_name VARCHAR(100),
    completion_percentage DECIMAL(5,2),
    total_items INTEGER,
    completed_items INTEGER,
    minutes_remaining INTEGER,
    alert_created BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_guard RECORD;
    v_completion RECORD;
    v_shift_info RECORD;
    v_alert_id UUID;
    v_result RECORD;
    v_pending_summary TEXT;
BEGIN
    -- Loop through all clocked-in guards
    FOR v_guard IN 
        SELECT * FROM get_clocked_in_guards()
    LOOP
        -- Get completion stats
        SELECT * INTO v_completion 
        FROM get_guard_checklist_completion(v_guard.guard_id, CURRENT_DATE);
        
        -- Get shift info
        SELECT sg.shift_id INTO v_guard.shift_id
        FROM security_guards sg
        WHERE sg.id = v_guard.guard_id;
        
        SELECT * INTO v_shift_info
        FROM get_shift_time_info(v_guard.shift_id);
        
        -- Initialize result
        v_result.guard_id := v_guard.guard_id;
        v_result.guard_name := v_guard.first_name || ' ' || COALESCE(v_guard.last_name, '');
        v_result.shift_name := v_shift_info.shift_name;
        v_result.completion_percentage := v_completion.completion_percentage;
        v_result.total_items := v_completion.total_items;
        v_result.completed_items := v_completion.completed_items;
        v_result.minutes_remaining := v_shift_info.minutes_remaining;
        v_result.alert_created := false;
        v_result.error_message := NULL;
        
        -- Check if we should alert
        IF v_completion.total_items = 0 THEN
            -- No checklist items for this shift
            v_result.error_message := 'No checklist items configured for this shift';
            
        ELSIF v_completion.completion_percentage >= 100.00 THEN
            -- Fully completed
            v_result.error_message := 'Checklist fully completed';
            
        ELSIF v_completion.completion_percentage >= p_completion_threshold THEN
            -- Above threshold (50% by default)
            v_result.error_message := 'Completion above threshold (' || p_completion_threshold || '%)';
            
        ELSIF p_only_past_midpoint AND NOT v_shift_info.is_past_midpoint THEN
            -- Before midpoint of shift
            v_result.error_message := 'Before shift midpoint';
            
        ELSIF NOT has_active_checklist_alert(v_guard.guard_id, CURRENT_DATE) THEN
            -- Meets criteria and no existing alert today
            
            -- Build pending items summary
            SELECT string_agg(
                (item->>'task_name') || ' (' || (item->>'category') || ')',
                ', '
                ORDER BY (item->>'priority')::INTEGER
            ) INTO v_pending_summary
            FROM jsonb_array_elements(v_completion.pending_items) AS item
            LIMIT 5;
            
            -- Create alert
            INSERT INTO panic_alerts (
                guard_id,
                alert_type,
                location_id,
                description,
                is_resolved
            ) VALUES (
                v_guard.guard_id,
                'checklist_incomplete',
                v_guard.location_id,
                'Guard has incomplete daily checklist. Completion: ' || 
                v_completion.completion_percentage || '% (' || 
                v_completion.completed_items || '/' || 
                v_completion.total_items || ' items). ' ||
                v_shift_info.minutes_remaining || ' minutes remaining in shift. ' ||
                'Pending tasks: ' || COALESCE(v_pending_summary, 'None listed') || '. ' ||
                'Please complete remaining items before shift end.',
                false
            )
            RETURNING id INTO v_alert_id;
            
            IF v_alert_id IS NOT NULL THEN
                v_result.alert_created := true;
            END IF;
        ELSE
            v_result.error_message := 'Active alert already exists for today';
        END IF;
        
        -- Return result if below threshold or alert was created
        IF v_completion.completion_percentage < p_completion_threshold OR v_result.alert_created THEN
            RETURN QUERY SELECT 
                v_result.guard_id,
                v_result.guard_name,
                v_result.shift_name,
                v_result.completion_percentage,
                v_result.total_items,
                v_result.completed_items,
                v_result.minutes_remaining,
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

GRANT EXECUTE ON FUNCTION get_shift_checklist_items(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_guard_checklist_completion(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_checklist_alert(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_shift_time_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_incomplete_checklists(DECIMAL, BOOLEAN) TO authenticated;

GRANT EXECUTE ON FUNCTION get_shift_checklist_items(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_guard_checklist_completion(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION has_active_checklist_alert(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION get_shift_time_info(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION detect_incomplete_checklists(DECIMAL, BOOLEAN) TO service_role;

-- ============================================
-- MANUAL TESTING
-- ============================================
--
-- To test the detection manually:
--
-- 1. View checklist completion for a guard:
-- SELECT * FROM get_guard_checklist_completion('guard-uuid-here');
--
-- 2. Check shift time info:
-- SELECT * FROM get_shift_time_info('shift-uuid-here');
--
-- 3. Run full detection (default: 50% threshold, only past midpoint):
-- SELECT * FROM detect_incomplete_checklists();
--
-- 4. Run detection without midpoint restriction:
-- SELECT * FROM detect_incomplete_checklists(50.00, false);
--
-- 5. Check created alerts:
-- SELECT * FROM panic_alerts 
-- WHERE alert_type = 'checklist_incomplete' 
-- ORDER BY created_at DESC;
--
-- ============================================
