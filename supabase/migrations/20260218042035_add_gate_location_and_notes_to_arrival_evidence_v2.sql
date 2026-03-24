ALTER TABLE material_arrival_evidence 
ADD COLUMN IF NOT EXISTS gate_location TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update the RPC to accept new parameters
CREATE OR REPLACE FUNCTION log_gate_entry(
  p_po_id UUID,
  p_photo_url TEXT,
  p_signature_url TEXT DEFAULT NULL,
  p_vehicle_number TEXT DEFAULT NULL,
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
BEGIN
  INSERT INTO material_arrival_evidence (
    po_id,
    photo_url,
    signature_url,
    vehicle_number,
    gate_location,
    notes,
    logged_by
  )
  VALUES (
    p_po_id,
    p_photo_url,
    p_signature_url,
    p_vehicle_number,
    p_gate_location,
    p_notes,
    auth.uid()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;;
