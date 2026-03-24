-- Migration 002: Service Evidence Enforcement
-- Add evidence columns to service_requests
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS before_photo_url TEXT,
ADD COLUMN IF NOT EXISTS after_photo_url TEXT,
ADD COLUMN IF NOT EXISTS completion_signature_url TEXT,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Hard Constraint: Completion REQUIRES photo evidence
-- Note: Using a trigger or check constraint. Since status is an ENUM or CUSTOM TYPE, 
-- we check for 'completed' status.
-- However, status is a USER-DEFINED type. I'll check its name.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_completion_requires_photo') THEN
        ALTER TABLE service_requests 
        ADD CONSTRAINT service_completion_requires_photo 
        CHECK (status::text != 'completed' OR after_photo_url IS NOT NULL);
    END IF;
END $$;

-- RPC: Start Service Task
CREATE OR REPLACE FUNCTION start_service_task(
    p_request_id UUID,
    p_before_photo_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE service_requests
    SET 
        status = 'in_progress',
        started_at = now(),
        before_photo_url = COALESCE(p_before_photo_url, before_photo_url),
        updated_at = now()
    WHERE id = p_request_id;
    
    RETURN FOUND;
END;
$$;

-- RPC: Complete Service Task with mandatory photo
CREATE OR REPLACE FUNCTION complete_service_task(
    p_request_id UUID,
    p_after_photo_url TEXT,
    p_completion_notes TEXT DEFAULT NULL,
    p_signature_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validation is handled by the table CHECK constraint, but let's be explicit
    IF p_after_photo_url IS NULL OR p_after_photo_url = '' THEN
        RAISE EXCEPTION 'Completion photo evidence is mandatory';
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
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION start_service_task TO authenticated;
GRANT EXECUTE ON FUNCTION complete_service_task TO authenticated;;
