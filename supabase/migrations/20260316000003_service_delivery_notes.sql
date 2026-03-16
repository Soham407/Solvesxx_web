-- Service Delivery Notes
-- Tracks personnel dispatched by suppliers for staffing/service POs.
-- Enables the Supplier → Admin → Buyer deployment confirmation workflow from PRD.

CREATE TABLE IF NOT EXISTS service_delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_number VARCHAR(50) UNIQUE NOT NULL,
  po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  delivery_date DATE NOT NULL,
  personnel_details JSONB NOT NULL DEFAULT '[]'::JSONB,
  -- Array of: [{name, id_proof_type, id_proof_number, qualification, photo_url, contact}]
  verified_by UUID REFERENCES employees(id),
  verified_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Status: pending | verified | rejected
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-number delivery notes
CREATE SEQUENCE IF NOT EXISTS delivery_note_number_seq START 1001;

CREATE OR REPLACE FUNCTION generate_delivery_note_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.delivery_note_number IS NULL OR NEW.delivery_note_number = '' THEN
    NEW.delivery_note_number := 'DN-' || LPAD(nextval('delivery_note_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_delivery_note_number
  BEFORE INSERT ON service_delivery_notes
  FOR EACH ROW EXECUTE FUNCTION generate_delivery_note_number();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_delivery_note_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_delivery_notes_updated_at
  BEFORE UPDATE ON service_delivery_notes
  FOR EACH ROW EXECUTE FUNCTION update_delivery_note_updated_at();

-- RLS
ALTER TABLE service_delivery_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_delivery_notes_select" ON service_delivery_notes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_delivery_notes_insert" ON service_delivery_notes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "service_delivery_notes_update" ON service_delivery_notes
  FOR UPDATE TO authenticated USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE service_delivery_notes;

-- Index for fast PO lookup
CREATE INDEX idx_service_delivery_notes_po_id ON service_delivery_notes(po_id);
CREATE INDEX idx_service_delivery_notes_status ON service_delivery_notes(status);
