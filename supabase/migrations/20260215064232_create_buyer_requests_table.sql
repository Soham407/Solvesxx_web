-- Sequence for request number generation
CREATE SEQUENCE IF NOT EXISTS request_seq START 1;

-- Requests Table (Buyer Order Requests)
CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE,               -- Auto-generated: REQ-2026-0001
    
    -- Buyer / Requester
    buyer_id UUID NOT NULL REFERENCES auth.users(id), -- The buyer user
    
    -- Request details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES product_categories(id),
    location_id UUID REFERENCES company_locations(id), -- Delivery site
    
    -- Scheduling
    preferred_delivery_date DATE,
    
    -- Status tracking (using existing request_status enum)
    status request_status DEFAULT 'pending' NOT NULL,
    
    -- Rejection details (mandatory for rejection)
    rejection_reason TEXT,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES auth.users(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Request Items Table
CREATE TABLE IF NOT EXISTS request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity DECIMAL(14, 2) NOT NULL,
    unit VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requests_buyer ON requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_category ON requests(category_id);
CREATE INDEX IF NOT EXISTS idx_request_items_request ON request_items(request_id);

-- Trigger for request_number
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.request_number := 'REQ-' || TO_CHAR(now(), 'YYYY') || '-' || 
        LPAD(nextval('request_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_request_number ON requests;
CREATE TRIGGER set_request_number
    BEFORE INSERT ON requests
    FOR EACH ROW
    WHEN (NEW.request_number IS NULL)
    EXECUTE FUNCTION generate_request_number();

-- Update trigger for updated_at
DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
CREATE TRIGGER update_requests_updated_at
    BEFORE UPDATE ON requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for requests
DROP POLICY IF EXISTS "Buyers View Own Requests" ON requests;
CREATE POLICY "Buyers View Own Requests"
    ON requests FOR SELECT
    TO authenticated
    USING (buyer_id = auth.uid() OR get_user_role() IN ('admin', 'company_hod', 'company_md', 'account'));

DROP POLICY IF EXISTS "Buyers Create Own Requests" ON requests;
CREATE POLICY "Buyers Create Own Requests"
    ON requests FOR INSERT
    TO authenticated
    WITH CHECK (buyer_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Buyers Update Own Pending Requests" ON requests;
CREATE POLICY "Buyers Update Own Pending Requests"
    ON requests FOR UPDATE
    TO authenticated
    USING (buyer_id = auth.uid() AND status = 'pending')
    WITH CHECK (buyer_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Admin Manage Requests" ON requests;
CREATE POLICY "Admin Manage Requests"
    ON requests FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account'));

-- RLS Policies for request_items
DROP POLICY IF EXISTS "View Request Items" ON request_items;
CREATE POLICY "View Request Items"
    ON request_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM requests r 
            WHERE r.id = request_items.request_id 
            AND (r.buyer_id = auth.uid() OR get_user_role() IN ('admin', 'company_hod', 'account'))
        )
    );

DROP POLICY IF EXISTS "Insert Request Items" ON request_items;
CREATE POLICY "Insert Request Items"
    ON request_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM requests r 
            WHERE r.id = request_items.request_id 
            AND r.buyer_id = auth.uid() 
            AND r.status = 'pending'
        )
    );

-- Update sale_bills policy to allow buyers to view their own invoices
DROP POLICY IF EXISTS "Buyers View Own Invoices" ON sale_bills;
CREATE POLICY "Buyers View Own Invoices"
    ON sale_bills FOR SELECT
    TO authenticated
    USING (client_id = auth.uid() OR get_user_role() IN ('admin', 'company_hod', 'account', 'company_md', 'society_manager'));
;
