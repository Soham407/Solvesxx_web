-- ============================================
-- PHASE C (PART 2): CONTRACTS & SALES
-- Missing tables required for integration testing
-- ============================================

-- ============================================
-- 1. CONTRACTS TABLE
-- Agreements with Societies (Clients)
-- ============================================

CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_number VARCHAR(50) UNIQUE NOT NULL,      -- CNT-2026-001
    
    -- Relationships
    society_id UUID NOT NULL REFERENCES societies(id),
    
    -- Contract Details
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'renewed')),
    
    -- Financials
    contract_value BIGINT DEFAULT 0,                  -- Total value in Paise
    payment_terms TEXT,                               -- e.g., "Monthly", "Quarterly"
    
    -- Documents
    document_url TEXT,                                -- Scan of physical contract
    
    -- Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_contracts_society ON contracts(society_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_dates ON contracts(start_date, end_date);

-- RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Contracts"
    ON contracts FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md', 'society_manager'));

CREATE POLICY "Manage Contracts"
    ON contracts FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'company_md'));


-- ============================================
-- 2. SALE BILLS (BUYER INVOICES)
-- Invoices sent to Societies (Clients)
-- ============================================

CREATE TABLE IF NOT EXISTS sale_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE,                -- INV-2026-0001 (Generated via trigger or app)
    
    -- Relationships
    client_id UUID NOT NULL REFERENCES societies(id), -- Client is a Society
    contract_id UUID REFERENCES contracts(id),        -- Optional link to contract
    
    -- Dates
    invoice_date DATE NOT NULL,
    due_date DATE,
    billing_period_start DATE,
    billing_period_end DATE,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'acknowledged', 'disputed', 'cancelled')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue')),
    
    -- Amounts (in Paise)
    subtotal BIGINT DEFAULT 0,
    tax_amount BIGINT DEFAULT 0,
    discount_amount BIGINT DEFAULT 0,
    total_amount BIGINT DEFAULT 0,                    -- subtotal + tax - discount
    paid_amount BIGINT DEFAULT 0,
    due_amount BIGINT DEFAULT 0,                      -- total - paid
    
    -- Payment info
    last_payment_date DATE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_sale_bills_client ON sale_bills(client_id);
CREATE INDEX idx_sale_bills_contract ON sale_bills(contract_id);
CREATE INDEX idx_sale_bills_status ON sale_bills(status);
CREATE INDEX idx_sale_bills_payment_status ON sale_bills(payment_status);
CREATE INDEX idx_sale_bills_date ON sale_bills(invoice_date);

-- RLS
ALTER TABLE sale_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Sale Bills"
    ON sale_bills FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md', 'society_manager'));

CREATE POLICY "Manage Sale Bills"
    ON sale_bills FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'account', 'company_md'));


-- ============================================
-- 3. SALE BILL ITEMS
-- Line items for buyer invoices
-- ============================================

CREATE TABLE IF NOT EXISTS sale_bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_bill_id UUID NOT NULL REFERENCES sale_bills(id) ON DELETE CASCADE,
    
    -- Linked Items
    service_id UUID REFERENCES services(id),          -- Bill for a service
    product_id UUID REFERENCES products(id),          -- Bill for a product supply
    
    -- Details
    item_description TEXT,                            -- Fallback/Override description
    quantity NUMERIC(10, 2) DEFAULT 1,
    unit_of_measure VARCHAR(20) DEFAULT 'units',
    
    -- Pricing (in Paise)
    unit_price BIGINT DEFAULT 0,
    tax_rate NUMERIC(5, 2) DEFAULT 0,                 -- Percentage (e.g., 18.00 for 18% GST)
    tax_amount BIGINT DEFAULT 0,
    discount_amount BIGINT DEFAULT 0,
    line_total BIGINT DEFAULT 0,                      -- (qty * price) + tax - discount
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sale_bill_items_bill ON sale_bill_items(sale_bill_id);

-- RLS
ALTER TABLE sale_bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Sale Bill Items"
    ON sale_bill_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sale_bills 
            WHERE sale_bills.id = sale_bill_items.sale_bill_id
            AND (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md', 'society_manager'))
        )
    );

CREATE POLICY "Manage Sale Bill Items"
    ON sale_bill_items FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'account', 'company_md'));


-- ============================================
-- 4. TRIGGERS
-- ============================================

-- Updated_at triggers
CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sale_bills_updated_at
    BEFORE UPDATE ON sale_bills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sale_bill_items_updated_at
    BEFORE UPDATE ON sale_bill_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();;
