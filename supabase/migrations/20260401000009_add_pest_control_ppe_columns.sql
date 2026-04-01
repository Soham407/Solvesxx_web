-- Migration to add PPE checklist columns as per PRD
ALTER TABLE pest_control_ppe_verifications 
ADD COLUMN IF NOT EXISTS job_session_id UUID REFERENCES job_sessions(id),
ADD COLUMN IF NOT EXISTS checklist JSONB,
ADD COLUMN IF NOT EXISTS all_items_checked BOOLEAN DEFAULT FALSE;

-- Function to check if all items in checklist are verified
CREATE OR REPLACE FUNCTION check_all_ppe_items(checklist JSONB) 
RETURNS BOOLEAN AS $$
DECLARE
    item RECORD;
BEGIN
    IF checklist IS NULL OR jsonb_array_length(checklist) = 0 THEN
        RETURN FALSE;
    END IF;

    FOR item IN SELECT * FROM jsonb_array_elements(checklist) LOOP
        IF (item.value->>'verified')::boolean IS NOT TRUE THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to update all_items_checked automatically
CREATE OR REPLACE FUNCTION update_ppe_all_items_checked()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.checklist IS NOT NULL THEN
        NEW.all_items_checked := check_all_ppe_items(NEW.checklist);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_ppe_all_items_checked ON pest_control_ppe_verifications;
CREATE TRIGGER trg_update_ppe_all_items_checked
BEFORE INSERT OR UPDATE ON pest_control_ppe_verifications
FOR EACH ROW
EXECUTE FUNCTION update_ppe_all_items_checked();

-- Update existing rows to use items_json if checklist is null
UPDATE pest_control_ppe_verifications 
SET checklist = items_json 
WHERE checklist IS NULL AND items_json IS NOT NULL;

-- Redefine view to include PPE status
DROP VIEW IF EXISTS service_requests_with_details;
CREATE VIEW service_requests_with_details
WITH (security_invoker = on) AS
SELECT
    sr.*,
    a.name AS asset_name,
    a.asset_code,
    e.first_name || ' ' || e.last_name AS technician_name,
    cl.location_name,
    sv.service_name,
    sv.service_code,
    (SELECT all_items_checked 
     FROM pest_control_ppe_verifications 
     WHERE service_request_id = sr.id 
     ORDER BY verified_at DESC LIMIT 1) AS ppe_verified
FROM service_requests sr
LEFT JOIN assets a ON sr.asset_id = a.id
LEFT JOIN employees e ON sr.assigned_to = e.id
LEFT JOIN company_locations cl ON sr.location_id = cl.id
LEFT JOIN services sv ON sr.service_id = sv.id;
