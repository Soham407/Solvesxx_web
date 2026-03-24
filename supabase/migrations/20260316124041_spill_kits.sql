CREATE TABLE IF NOT EXISTS pest_control_spill_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_code VARCHAR(50) UNIQUE NOT NULL,
  location_id UUID REFERENCES company_locations(id),
  items_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  last_inspected_at TIMESTAMPTZ,
  inspected_by UUID REFERENCES employees(id),
  status VARCHAR(20) NOT NULL DEFAULT 'ok',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_spill_kit_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_spill_kit_updated_at
  BEFORE UPDATE ON pest_control_spill_kits
  FOR EACH ROW EXECUTE FUNCTION update_spill_kit_updated_at();

ALTER TABLE pest_control_spill_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spill_kits_select" ON pest_control_spill_kits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "spill_kits_insert" ON pest_control_spill_kits
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "spill_kits_update" ON pest_control_spill_kits
  FOR UPDATE TO authenticated USING (true);

CREATE INDEX idx_pest_control_spill_kits_status ON pest_control_spill_kits(status);;
