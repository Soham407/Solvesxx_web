-- Shortage Notes & Items
-- Tracks material shortages identified during GRN inspection.

CREATE TABLE IF NOT EXISTS shortage_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_number VARCHAR(50) UNIQUE NOT NULL,
  grn_id UUID,
  -- References grns(id) — FK omitted as grn table may use different name
  po_id UUID REFERENCES purchase_orders(id) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  -- open | acknowledged | resolved | disputed
  total_shortage_value DECIMAL(12, 2) DEFAULT 0,
  resolution TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shortage_note_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortage_note_id UUID REFERENCES shortage_notes(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(200),
  ordered_quantity DECIMAL(10, 2) NOT NULL,
  received_quantity DECIMAL(10, 2) NOT NULL,
  shortage_quantity DECIMAL(10, 2) GENERATED ALWAYS AS (ordered_quantity - received_quantity) STORED,
  unit VARCHAR(20),
  rate DECIMAL(10, 2),
  shortage_value DECIMAL(12, 2) GENERATED ALWAYS AS (
    (ordered_quantity - received_quantity) * COALESCE(rate, 0)
  ) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-number
CREATE SEQUENCE IF NOT EXISTS shortage_note_seq START 1001;

CREATE OR REPLACE FUNCTION generate_shortage_note_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.note_number IS NULL OR NEW.note_number = '' THEN
    NEW.note_number := 'SN-' || LPAD(nextval('shortage_note_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_shortage_note_number
  BEFORE INSERT ON shortage_notes
  FOR EACH ROW EXECUTE FUNCTION generate_shortage_note_number();

CREATE OR REPLACE FUNCTION update_shortage_note_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_shortage_note_updated_at
  BEFORE UPDATE ON shortage_notes
  FOR EACH ROW EXECUTE FUNCTION update_shortage_note_updated_at();

-- RLS
ALTER TABLE shortage_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortage_note_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shortage_notes_select" ON shortage_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "shortage_notes_insert" ON shortage_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "shortage_notes_update" ON shortage_notes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "shortage_note_items_select" ON shortage_note_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "shortage_note_items_insert" ON shortage_note_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_shortage_notes_po_id ON shortage_notes(po_id);
CREATE INDEX idx_shortage_notes_supplier_id ON shortage_notes(supplier_id);
CREATE INDEX idx_shortage_notes_status ON shortage_notes(status);
CREATE INDEX idx_shortage_note_items_note_id ON shortage_note_items(shortage_note_id);
