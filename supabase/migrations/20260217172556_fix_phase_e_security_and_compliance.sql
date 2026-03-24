
-- ============================================================
-- FIX 1: Add search_path to force_match_bill (SECURITY)
-- Without this, a malicious search_path can redirect table
-- lookups to attacker-controlled schemas within SECURITY DEFINER.
-- ============================================================
CREATE OR REPLACE FUNCTION force_match_bill(
    p_bill_id UUID,
    p_reason TEXT,
    p_evidence_url TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID;
BEGIN
    v_actor_id := auth.uid();
    
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Record must exist
    IF NOT EXISTS (SELECT 1 FROM purchase_bills WHERE id = p_bill_id) THEN
        RAISE EXCEPTION 'Bill not found';
    END IF;
    
    -- Update bill
    UPDATE purchase_bills 
    SET 
        is_reconciled = TRUE,
        reconciled_at = now(),
        reconciled_by = v_actor_id,
        match_status = 'force_matched',
        notes = COALESCE(notes, '') || E'\n[FORCE MATCH ' || now()::text || '] ' || p_reason
    WHERE id = p_bill_id;

    -- Log action in audit trail
    INSERT INTO audit_logs (
        table_name,
        record_id,
        actor_id,
        action,
        new_data,
        evidence_url
    ) VALUES (
        'purchase_bills',
        p_bill_id,
        v_actor_id,
        'FORCE_MATCH',
        jsonb_build_object('reason', p_reason, 'timestamp', now()::text),
        p_evidence_url
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- ============================================================
-- FIX 2: Add search_path to generate_daily_compliance_snapshot
-- Also fix to use data_payload JSONB column (the real schema)
-- instead of non-existent columns.
-- ============================================================
CREATE OR REPLACE FUNCTION generate_daily_compliance_snapshot() 
RETURNS JSON AS $$
DECLARE
    v_late_count INTEGER;
    v_missing_selfie INTEGER;
    v_total INTEGER;
    v_score NUMERIC;
    v_on_duty INTEGER;
BEGIN
    -- Get base metrics
    SELECT count(*) INTO v_total FROM employees WHERE is_active = true;
    
    -- Late arrival check (grace period until 09:15)
    SELECT count(*) INTO v_late_count 
    FROM attendance_logs 
    WHERE log_date = CURRENT_DATE 
    AND check_in_time::time > '09:15:00';

    -- Missing selfie evidence check
    SELECT count(*) INTO v_missing_selfie 
    FROM attendance_logs 
    WHERE log_date = CURRENT_DATE 
    AND check_in_selfie_url IS NULL;

    SELECT count(*) INTO v_on_duty 
    FROM attendance_logs 
    WHERE log_date = CURRENT_DATE;

    -- Calculate Compliance Score
    IF v_total > 0 THEN
        v_score := GREATEST(0, 100 - ((v_late_count + v_missing_selfie)::numeric / v_total * 100));
    ELSE
        v_score := 100;
    END IF;

    -- Store in the EXISTING compliance_snapshots schema using data_payload JSONB
    INSERT INTO compliance_snapshots (
        snapshot_name,
        snapshot_date,
        data_payload,
        is_locked
    ) VALUES (
        'daily_hr_compliance_' || CURRENT_DATE::text,
        now(),
        jsonb_build_object(
            'type', 'daily_hr_compliance',
            'snapshot_date', CURRENT_DATE,
            'total_employees', v_total,
            'on_duty', v_on_duty,
            'late_arrivals', v_late_count,
            'missing_selfies', v_missing_selfie,
            'compliance_score', v_score
        ),
        true
    );

    RETURN json_build_object(
        'status', 'success',
        'score', v_score,
        'violations', v_late_count + v_missing_selfie
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- ============================================================
-- FIX 3: Add status guard to complete_service_task
-- Prevents double-completion or completing a cancelled request.
-- ============================================================
CREATE OR REPLACE FUNCTION complete_service_task(
    p_request_id UUID,
    p_after_photo_url TEXT,
    p_completion_notes TEXT DEFAULT NULL,
    p_signature_url TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_status TEXT;
BEGIN
    -- Validation: photo evidence is mandatory
    IF p_after_photo_url IS NULL OR p_after_photo_url = '' THEN
        RAISE EXCEPTION 'Completion photo evidence is mandatory';
    END IF;

    -- Status guard: prevent double-completion
    SELECT status INTO v_current_status
    FROM service_requests WHERE id = p_request_id;
    
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Service request not found';
    END IF;
    
    IF v_current_status = 'completed' THEN
        RAISE EXCEPTION 'Service request is already completed';
    END IF;
    
    IF v_current_status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot complete a cancelled service request';
    END IF;

    UPDATE service_requests
    SET 
        status = 'completed',
        completed_at = now(),
        after_photo_url = p_after_photo_url,
        completion_notes = p_completion_notes,
        completion_signature_url = p_signature_url,
        updated_at = now()
    WHERE id = p_request_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- ============================================================
-- FIX 4: Add INSERT policy for audit_logs
-- force_match_bill uses SECURITY DEFINER so this is defense-in-depth
-- ============================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND cmd = 'INSERT'
  ) THEN
    EXECUTE 'CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid())';
  END IF;
END $$;

-- ============================================================
-- FIX 5: Optimize resident_directory view
-- Move the role check into a single function call to avoid 
-- N+1 subqueries per row.
-- ============================================================
CREATE OR REPLACE VIEW resident_directory AS
SELECT 
    r.id,
    r.full_name,
    f.flat_number,
    b.building_name,
    r.is_primary_contact,
    r.is_active,
    CASE 
        WHEN get_user_role() IN ('admin', 'company_md', 'society_manager')
        THEN r.phone::text
        ELSE 
            CASE 
                WHEN r.phone IS NULL THEN NULL 
                ELSE 'XXXXXX' || right(r.phone::text, 4) 
            END
    END as masked_phone,
    CASE 
        WHEN get_user_role() IN ('admin', 'company_md', 'society_manager')
        THEN r.email::text
        ELSE 
            CASE 
                WHEN r.email IS NULL THEN NULL 
                ELSE '***@***.com' 
            END
    END as masked_email
FROM residents r
LEFT JOIN flats f ON r.flat_id = f.id
LEFT JOIN buildings b ON f.building_id = b.id;

-- Drop the stale unique constraint that was accidentally added
-- (compliance_snapshots didn't get the new columns, so the constraint
-- on snapshot_date would conflict with the existing schema where
-- snapshot_date is timestamptz, not date)
ALTER TABLE compliance_snapshots 
DROP CONSTRAINT IF EXISTS compliance_snapshots_date_unique;
;
