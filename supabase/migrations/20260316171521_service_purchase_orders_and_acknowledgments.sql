
-- Service Purchase Orders
CREATE TABLE IF NOT EXISTS service_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spo_number VARCHAR(50) UNIQUE NOT NULL,
  vendor_id UUID REFERENCES suppliers(id),
  service_type VARCHAR(100) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  total_amount BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  terms_conditions TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE service_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage SPOs"
  ON service_purchase_orders FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Service Purchase Order Items
CREATE TABLE IF NOT EXISTS service_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spo_id UUID NOT NULL REFERENCES service_purchase_orders(id) ON DELETE CASCADE,
  service_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit VARCHAR(50),
  unit_price BIGINT NOT NULL DEFAULT 0,
  line_total BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE service_purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage SPO items"
  ON service_purchase_order_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Service Acknowledgments
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
CREATE POLICY "Admin and site supervisor can manage acknowledgments"
  ON service_acknowledgments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
;
