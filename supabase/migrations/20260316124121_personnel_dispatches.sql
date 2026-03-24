CREATE TABLE IF NOT EXISTS personnel_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_number VARCHAR(50) UNIQUE NOT NULL,
  service_po_id UUID REFERENCES purchase_orders(id) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  personnel_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  deployment_site_id UUID REFERENCES company_locations(id),
  status VARCHAR(20) NOT NULL DEFAULT 'dispatched',
  confirmed_by UUID REFERENCES employees(id),
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS personnel_dispatch_seq START 1001;

CREATE OR REPLACE FUNCTION generate_dispatch_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.dispatch_number IS NULL OR NEW.dispatch_number = '' THEN
    NEW.dispatch_number := 'PD-' || LPAD(nextval('personnel_dispatch_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_dispatch_number
  BEFORE INSERT ON personnel_dispatches
  FOR EACH ROW EXECUTE FUNCTION generate_dispatch_number();

CREATE OR REPLACE FUNCTION update_dispatch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_dispatch_updated_at
  BEFORE UPDATE ON personnel_dispatches
  FOR EACH ROW EXECUTE FUNCTION update_dispatch_updated_at();

ALTER TABLE personnel_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispatches_select" ON personnel_dispatches FOR SELECT TO authenticated USING (true);
CREATE POLICY "dispatches_insert" ON personnel_dispatches FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "dispatches_update" ON personnel_dispatches FOR UPDATE TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE personnel_dispatches;

CREATE INDEX idx_personnel_dispatches_po_id ON personnel_dispatches(service_po_id);
CREATE INDEX idx_personnel_dispatches_status ON personnel_dispatches(status);;
