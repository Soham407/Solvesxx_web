-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- rtv_tickets table
CREATE TABLE IF NOT EXISTS rtv_tickets (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    rtv_number VARCHAR(50) UNIQUE NOT NULL,
    po_id UUID REFERENCES purchase_orders(id),
    supplier_id UUID REFERENCES suppliers(id) NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    receipt_id UUID REFERENCES material_receipts(id),
    return_reason VARCHAR(100) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measurement VARCHAR(20),
    estimated_value DECIMAL(12, 2),
    status VARCHAR(50) DEFAULT 'pending_dispatch',
    credit_note_number VARCHAR(50),
    credit_note_amount DECIMAL(12, 2),
    photo_urls JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    dispatched_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    credit_issued_at TIMESTAMP WITH TIME ZONE,
    raised_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS
ALTER TABLE rtv_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on rtv_tickets" ON rtv_tickets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on rtv_tickets" ON rtv_tickets
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on rtv_tickets" ON rtv_tickets
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- auto updated_at trigger
DROP TRIGGER IF EXISTS update_rtv_tickets_updated_at ON rtv_tickets;
CREATE TRIGGER update_rtv_tickets_updated_at
    BEFORE UPDATE ON rtv_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rtv_tickets;
;
