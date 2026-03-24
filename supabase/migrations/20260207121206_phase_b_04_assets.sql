-- ============================================
-- PHASE B MIGRATION 04: ASSETS TABLE
-- ============================================

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identification
    asset_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Categorization
    category_id UUID REFERENCES asset_categories(id) NOT NULL,
    
    -- Location
    location_id UUID REFERENCES company_locations(id) NOT NULL,
    
    -- Multi-tenant support
    society_id UUID REFERENCES societies(id),
    
    -- Hardware details
    serial_number VARCHAR(100),
    model_number VARCHAR(100),
    manufacturer VARCHAR(100),
    
    -- Financial tracking
    purchase_date DATE,
    purchase_cost DECIMAL(12, 2),
    warranty_expiry DATE,
    expected_life_years INTEGER,
    
    -- Status tracking
    status asset_status DEFAULT 'functional',
    
    -- Vendor relationship
    vendor_id UUID REFERENCES suppliers(id),
    
    -- Technical specs (flexible JSONB)
    specifications JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_assets_asset_code ON assets(asset_code);
CREATE INDEX idx_assets_category_id ON assets(category_id);
CREATE INDEX idx_assets_location_id ON assets(location_id);
CREATE INDEX idx_assets_society_id ON assets(society_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_vendor_id ON assets(vendor_id);

-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "View Assets" ON assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert Assets" ON assets FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('admin', 'company_hod', 'society_manager'));
CREATE POLICY "Update Assets" ON assets FOR UPDATE TO authenticated USING (get_user_role() IN ('admin', 'company_hod', 'society_manager'));
CREATE POLICY "Delete Assets" ON assets FOR DELETE TO authenticated USING (get_user_role() IN ('admin'));;
