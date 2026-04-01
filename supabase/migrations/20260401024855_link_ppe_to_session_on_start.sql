-- Migration to automatically link the latest verified PPE record to a newly started job session
-- This ensures that the completion gate (which checks for job_session_id) is satisfied
-- even if PPE verification was completed before starting the session.

CREATE OR REPLACE FUNCTION link_pest_control_ppe_on_session_start()
RETURNS TRIGGER AS $$
BEGIN
    -- Only for started or paused sessions (resumed)
    IF NEW.status IN ('started', 'paused') THEN
        -- Find the latest PPE verification for this request and technician that isn't already linked to another session
        UPDATE pest_control_ppe_verifications
        SET job_session_id = NEW.id
        WHERE id = (
            SELECT id
            FROM pest_control_ppe_verifications
            WHERE service_request_id = NEW.service_request_id
              AND technician_id = NEW.technician_id
              AND all_items_checked = TRUE
              AND job_session_id IS NULL
            ORDER BY verified_at DESC
            LIMIT 1
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger to link PPE when session is started or updated to started
DROP TRIGGER IF EXISTS trg_link_pest_control_ppe_on_session_start ON job_sessions;
CREATE TRIGGER trg_link_pest_control_ppe_on_session_start
AFTER INSERT OR UPDATE ON job_sessions
FOR EACH ROW
EXECUTE FUNCTION link_pest_control_ppe_on_session_start();
