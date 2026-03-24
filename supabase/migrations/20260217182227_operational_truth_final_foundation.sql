
-- Phase A: Material Arrival Evidence
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

-- RPC: Update PO and Log Evidence
CREATE OR REPLACE FUNCTION log_gate_entry(
    p_po_id UUID,
    p_photo_url TEXT,
    p_signature_url TEXT DEFAULT NULL,
    p_vehicle_number TEXT DEFAULT NULL,
    p_driver_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO material_arrival_evidence (po_id, photo_url, signature_url, vehicle_number, driver_name, logged_by)
    VALUES (p_po_id, p_photo_url, p_signature_url, p_vehicle_number, p_driver_name, auth.uid())
    RETURNING id INTO v_log_id;
    
    UPDATE purchase_orders SET status = 'arrived' WHERE id = p_po_id;
    
    RETURN v_log_id;
END;
$$;

-- Phase E: Geofencing
CREATE OR REPLACE FUNCTION check_geofence(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_site_lat DOUBLE PRECISION,
    p_site_lng DOUBLE PRECISION,
    p_radius_meters DOUBLE PRECISION DEFAULT 200
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_distance DOUBLE PRECISION;
BEGIN
    SELECT (6371000 * acos(cos(radians(p_lat)) * cos(radians(p_site_lat)) * cos(radians(p_site_lng) - radians(p_lng)) + sin(radians(p_lat)) * sin(radians(p_site_lat))))
    INTO v_distance;
    RETURN v_distance <= p_radius_meters;
END;
$$;

-- Phase D: Storage & RLS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('staff-compliance-docs', 'staff-compliance-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Fix RLS with correct table joins
CREATE POLICY "Staff view compliance docs v3"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'staff-compliance-docs' AND (owner = auth.uid() OR exists (
    SELECT 1 FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.role_name IN ('admin', 'company_md', 'company_hod', 'society_manager')
)));

CREATE POLICY "Managers manage compliance docs v3"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'staff-compliance-docs' AND exists (
    SELECT 1 FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.role_name IN ('admin', 'company_md', 'company_hod', 'society_manager')
));
;
