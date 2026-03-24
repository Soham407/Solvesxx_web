-- Migration 005: HRMS & Compliance Automation
-- This implements the "Truth Verification" for HR operations

CREATE TABLE IF NOT EXISTS compliance_snapshots (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_employees INTEGER,
    on_duty INTEGER,
    late_arrivals INTEGER,
    missing_selfies INTEGER,
    compliance_score NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES users(id)
);

-- Function to run the compliance engine for the day
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
    
    -- Late arrival check (Assumed shift start is 09:00:00, grace until 09:15:00)
    -- This follows the "Operational Truth" that time cannot be argued with
    SELECT count(*) INTO v_late_count 
    FROM attendance_logs 
    WHERE log_date = CURRENT_DATE 
    AND check_in_time::time > '09:15:00';

    -- Missing evidence check (Selfie is mandatory for truth verification)
    SELECT count(*) INTO v_missing_selfie 
    FROM attendance_logs 
    WHERE log_date = CURRENT_DATE 
    AND check_in_selfie_url IS NULL;

    SELECT count(*) INTO v_on_duty 
    FROM attendance_logs 
    WHERE log_date = CURRENT_DATE;

    -- Calculate Compliance Score (Deduction based model)
    -- Every violation reduces the truth score of the operation
    IF v_total > 0 THEN
        v_score := GREATEST(0, 100 - ((v_late_count + v_missing_selfie)::numeric / v_total * 100));
    ELSE
        v_score := 100;
    END IF;

    -- Upsert snapshot for today
    INSERT INTO compliance_snapshots (
        snapshot_date,
        total_employees,
        on_duty,
        late_arrivals,
        missing_selfies,
        compliance_score
    ) VALUES (
        CURRENT_DATE,
        v_total,
        v_on_duty,
        v_late_count,
        v_missing_selfie,
        v_score
    )
    ON CONFLICT (snapshot_date) DO UPDATE SET
        total_employees = EXCLUDED.total_employees,
        on_duty = EXCLUDED.on_duty,
        late_arrivals = EXCLUDED.late_arrivals,
        missing_selfies = EXCLUDED.missing_selfies,
        compliance_score = EXCLUDED.compliance_score;

    RETURN json_build_object(
        'status', 'success',
        'score', v_score,
        'violations', v_late_count + v_missing_selfie
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add UNIQUE constraint to snapshot_date to allow UPSERT
ALTER TABLE compliance_snapshots DROP CONSTRAINT IF EXISTS compliance_snapshots_date_unique;
ALTER TABLE compliance_snapshots ADD CONSTRAINT compliance_snapshots_date_unique UNIQUE (snapshot_date);
;
