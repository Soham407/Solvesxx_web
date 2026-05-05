CREATE TABLE IF NOT EXISTS service_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spo_id UUID REFERENCES service_purchase_orders(id),
  acknowledged_by UUID REFERENCES users(id),
  headcount_expected INT,
  headcount_received INT,
  grade_verified BOOLEAN DEFAULT FALSE,
  notes TEXT,
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE service_acknowledgments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin and site supervisor can manage acknowledgments" ON service_acknowledgments;
CREATE POLICY "Admin and site supervisor can manage acknowledgments"
  ON service_acknowledgments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);;
