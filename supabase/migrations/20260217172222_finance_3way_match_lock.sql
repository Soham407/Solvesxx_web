-- Migration 003: Finance 3-Way Match Enforcement
ALTER TABLE purchase_bills 
ADD COLUMN IF NOT EXISTS is_reconciled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS match_status TEXT DEFAULT 'pending';

-- RPC for Force-Match when 3-way match fails but Human approval is given
-- This ensures that even "exceptions" are logged as a source of truth
CREATE OR REPLACE FUNCTION force_match_bill(
    p_bill_id UUID,
    p_reason TEXT,
    p_evidence_url TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_actor_id UUID;
BEGIN
    v_actor_id := auth.uid();
    
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
        match_status = 'matched',
        notes = COALESCE(notes, '') || E'\nForce matched: ' || p_reason
    WHERE id = p_bill_id;

    -- Log action
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
        jsonb_build_object('reason', p_reason),
        p_evidence_url
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
;
