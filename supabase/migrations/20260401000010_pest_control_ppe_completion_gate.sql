-- Migration to enforce PPE verification for Pest Control jobs at DB level
-- Also adds discrete boolean columns for PPE checklist items

ALTER TABLE pest_control_ppe_verifications 
ADD COLUMN IF NOT EXISTS gloves_worn BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mask_worn BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS goggles_worn BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS full_suit_worn BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS chemical_dilution_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS resident_area_cleared BOOLEAN DEFAULT FALSE;

-- Update the check_all_ppe_items function to also consider the new boolean columns
-- or simply rely on all_items_checked being set correctly.
-- We'll update the trigger function to handle both JSONB and discrete columns.

CREATE OR REPLACE FUNCTION update_ppe_all_items_checked()
RETURNS TRIGGER AS $$
BEGIN
    -- If using discrete columns, check them
    IF NEW.gloves_worn IS NOT NULL THEN
        NEW.all_items_checked := 
            NEW.gloves_worn AND 
            NEW.mask_worn AND 
            NEW.goggles_worn AND 
            NEW.full_suit_worn AND 
            NEW.chemical_dilution_verified AND 
            NEW.resident_area_cleared;
    -- Fallback to JSONB if discrete columns are not all set (just in case)
    ELSIF NEW.checklist IS NOT NULL THEN
        NEW.all_items_checked := check_all_ppe_items(NEW.checklist);
    END IF;
    
    -- Also update status to 'verified' if all items are checked
    IF NEW.all_items_checked THEN
        NEW.status := 'verified';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger to be sure it's updated
DROP TRIGGER IF EXISTS trg_update_ppe_all_items_checked ON pest_control_ppe_verifications;
CREATE TRIGGER trg_update_ppe_all_items_checked
BEFORE INSERT OR UPDATE ON pest_control_ppe_verifications
FOR EACH ROW
EXECUTE FUNCTION update_ppe_all_items_checked();

-- Now the core deliverable: the job_sessions trigger
CREATE OR REPLACE FUNCTION enforce_pest_control_ppe()
RETURNS TRIGGER AS $$
DECLARE
    v_service_code VARCHAR;
    v_ppe_verified BOOLEAN;
BEGIN
    -- Only check when status is changing to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
        -- Get service_code for this session's request
        SELECT s.service_code INTO v_service_code
        FROM service_requests sr
        JOIN services s ON sr.service_id = s.id
        WHERE sr.id = NEW.service_request_id;

        -- If it's a pest control job, check PPE
        IF v_service_code = 'PST-CON' THEN
            SELECT EXISTS (
                SELECT 1 
                FROM pest_control_ppe_verifications 
                WHERE job_session_id = NEW.id 
                AND all_items_checked = TRUE
            ) INTO v_ppe_verified;

            IF NOT v_ppe_verified THEN
                RAISE EXCEPTION 'PPE verification required before completing pest control job';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_pest_control_ppe ON job_sessions;
CREATE TRIGGER trg_enforce_pest_control_ppe
BEFORE UPDATE ON job_sessions
FOR EACH ROW
EXECUTE FUNCTION enforce_pest_control_ppe();

-- Fix RLS policies to allow technicians (service_boy) to insert PPE verifications
DO $$ BEGIN
    -- Allow insertion by technicians for themselves
    CREATE POLICY "Technicians can insert own PPE verifications"
        ON pest_control_ppe_verifications FOR INSERT
        TO authenticated
        WITH CHECK (
            technician_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
            OR get_user_role() IN ('admin', 'society_manager', 'company_hod')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    -- Allow update by technicians for themselves
    CREATE POLICY "Technicians can update own PPE verifications"
        ON pest_control_ppe_verifications FOR UPDATE
        TO authenticated
        USING (
            technician_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
            OR get_user_role() IN ('admin', 'society_manager', 'company_hod')
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
