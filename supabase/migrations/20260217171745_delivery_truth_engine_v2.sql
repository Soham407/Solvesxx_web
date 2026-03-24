-- Create material arrival logs table
CREATE TABLE IF NOT EXISTS material_arrival_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    vehicle_number TEXT NOT NULL CHECK (length(vehicle_number) >= 4),
    arrival_photo_url TEXT NOT NULL, -- MANDATORY
    arrival_signature_url TEXT, -- Optional for Phase 1
    logged_by UUID NOT NULL REFERENCES users(id),
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    gate_location TEXT,
    notes TEXT,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE material_arrival_logs ENABLE ROW LEVEL SECURITY;

-- Only delivery_boy and security_guard can create logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delivery_boy_can_log_arrivals' AND tablename = 'material_arrival_logs') THEN
        CREATE POLICY "delivery_boy_can_log_arrivals"
        ON material_arrival_logs FOR INSERT
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.id = auth.uid()
                AND r.role_name::text IN ('delivery_boy', 'security_guard')
            )
        );
    END IF;
END $$;

-- All authenticated users can view logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'all_can_view_arrival_logs' AND tablename = 'material_arrival_logs') THEN
        CREATE POLICY "all_can_view_arrival_logs"
        ON material_arrival_logs FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_arrival_po ON material_arrival_logs(po_id);
CREATE INDEX IF NOT EXISTS idx_material_arrival_logged_by ON material_arrival_logs(logged_by);
CREATE INDEX IF NOT EXISTS idx_material_arrival_logged_at ON material_arrival_logs(logged_at DESC);

-- RPC: Log material arrival with validation
CREATE OR REPLACE FUNCTION log_material_arrival(
    p_po_id UUID,
    p_vehicle_number TEXT,
    p_arrival_photo_url TEXT,
    p_arrival_signature_url TEXT DEFAULT NULL,
    p_gate_location TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
    v_user_role TEXT;
BEGIN
    -- Verify user role
    SELECT r.role_name::text INTO v_user_role
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid();
    
    IF v_user_role NOT IN ('delivery_boy', 'security_guard') THEN
        RAISE EXCEPTION 'Unauthorized: Only delivery_boy or security_guard can log arrivals';
    END IF;
    
    -- Verify PO exists
    IF NOT EXISTS (SELECT 1 FROM purchase_orders WHERE id = p_po_id) THEN
        RAISE EXCEPTION 'Invalid PO ID: %', p_po_id;
    END IF;
    
    -- Validate photo URL (must be from Supabase Storage)
    IF p_arrival_photo_url IS NULL OR p_arrival_photo_url = '' THEN
        RAISE EXCEPTION 'Arrival photo is mandatory';
    END IF;
    
    IF NOT p_arrival_photo_url LIKE '%/storage/v1/object/%' THEN
        RAISE EXCEPTION 'Invalid photo URL: Must be from Supabase Storage';
    END IF;
    
    -- Insert log
    INSERT INTO material_arrival_logs (
        po_id,
        vehicle_number,
        arrival_photo_url,
        arrival_signature_url,
        logged_by,
        gate_location,
        notes
    ) VALUES (
        p_po_id,
        p_vehicle_number,
        p_arrival_photo_url,
        p_arrival_signature_url,
        auth.uid(),
        p_gate_location,
        p_notes
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_material_arrival TO authenticated;;
