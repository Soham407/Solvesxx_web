
-- PHASE A: Delivery Truth Engine
CREATE TABLE IF NOT EXISTS material_arrival_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    signature_url TEXT,
    vehicle_number TEXT,
    driver_name TEXT,
    arrival_status TEXT DEFAULT 'arrived' CHECK (arrival_status IN ('arrived', 'completed')),
    logged_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Constraint: Photo is mandatory for arrival record
ALTER TABLE material_arrival_evidence ADD CONSTRAINT arrival_requires_photo CHECK (photo_url IS NOT NULL);

-- RPC: Log Gate Entry (Truthful)
CREATE OR REPLACE FUNCTION log_gate_entry(
    p_po_id UUID,
    p_photo_url TEXT,
    p_signature_url TEXT DEFAULT NULL,
    p_vehicle_number TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO material_arrival_evidence (po_id, photo_url, signature_url, vehicle_number, logged_by)
    VALUES (p_po_id, p_photo_url, p_signature_url, p_vehicle_number, auth.uid())
    RETURNING id INTO v_log_id;
    
    -- Update PO status to reflect arrival
    UPDATE purchase_orders SET status = 'arrived' WHERE id = p_po_id;
    
    RETURN v_log_id;
END;
$$;

-- PHASE B: Service Evidence Loop
-- Add tracking columns if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'service_requests' AND COLUMN_NAME = 'before_photo_url') THEN
        ALTER TABLE service_requests ADD COLUMN before_photo_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'service_requests' AND COLUMN_NAME = 'after_photo_url') THEN
        ALTER TABLE service_requests ADD COLUMN after_photo_url TEXT;
    END IF;
END $$;

-- Trigger Function: Enforce Evidence for Completion
CREATE OR REPLACE FUNCTION enforce_service_completion_evidence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (NEW.status = 'completed') THEN
        IF (NEW.before_photo_url IS NULL OR NEW.after_photo_url IS NULL) THEN
            RAISE EXCEPTION 'Operational Truth Error: "Before" and "After" photos are mandatory to complete a task.';
        END IF;
        IF (NEW.resolution_notes IS NULL OR length(NEW.resolution_notes) < 10) THEN
            RAISE EXCEPTION 'Operational Truth Error: Meaningful resolution notes (min 10 chars) required.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_service_evidence ON service_requests;
CREATE TRIGGER trg_enforce_service_evidence
    BEFORE UPDATE ON service_requests
    FOR EACH ROW
    EXECUTE FUNCTION enforce_service_completion_evidence();

-- PHASE C: Audit Logs for Force Payout
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (length(reason) >= 10),
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
;
