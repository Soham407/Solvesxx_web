-- Add 'closed' status to service_request_status enum
-- Since ALTER TYPE ADD VALUE cannot be executed in a transaction block in some versions, 
-- we use this approach to safely add it if missing.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'closed' AND enumtypid = 'service_request_status'::regtype) THEN
        ALTER TYPE service_request_status ADD VALUE 'closed';
    END IF;
END $$;

-- Add service_request_id FK to buyer_feedback if it doesn't exist
-- Note: the existing buyer_feedback table might be used for 'requests' (orders).
-- We're extending it to support 'service_requests'.
ALTER TABLE buyer_feedback 
ADD COLUMN IF NOT EXISTS service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE;

-- Create an index for the new column
CREATE INDEX IF NOT EXISTS idx_buyer_feedback_service_request_id ON buyer_feedback(service_request_id);

-- Trigger function to enforce buyer feedback before closing a service request
CREATE OR REPLACE FUNCTION enforce_feedback_before_close()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check if status is transitioning to 'closed'
    IF NEW.status::text = 'closed' AND (OLD.status IS NULL OR OLD.status::text != 'closed') THEN
        -- Check if feedback exists for this service request
        IF NOT EXISTS (
            SELECT 1 FROM buyer_feedback 
            WHERE service_request_id = NEW.id
        ) THEN
            RAISE EXCEPTION 'Buyer feedback required before closing service request';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to service_requests table
DROP TRIGGER IF EXISTS trg_enforce_feedback_before_close ON service_requests;
CREATE TRIGGER trg_enforce_feedback_before_close
BEFORE UPDATE ON service_requests
FOR EACH ROW
WHEN (NEW.status::text = 'closed')
EXECUTE FUNCTION enforce_feedback_before_close();

-- Also ensure 'closed' status exists in RLS or other relevant tables if needed
-- (The existing policies for UPDATE on service_requests usually use 'status' check which will now include 'closed')
