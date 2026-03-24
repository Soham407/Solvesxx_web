-- ============================================================
-- Phase E Supplement: Service Domain Extensions
-- Specialized tables for Pest Control and Printing & Advertising
-- ============================================================

-- ============================================
-- 1. PEST CONTROL: CHEMICAL INVENTORY
-- Tracks specialized chemicals separately from general inventory
-- ============================================

CREATE TABLE IF NOT EXISTS pest_control_chemicals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) NOT NULL,
    current_stock DECIMAL(15, 2) DEFAULT 0 NOT NULL,
    unit VARCHAR(20) DEFAULT 'liters' NOT NULL, -- liters, kg, units
    reorder_level DECIMAL(15, 2) DEFAULT 5 NOT NULL,
    last_restocked_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_pc_chemicals_product ON pest_control_chemicals(product_id);

-- ============================================
-- 2. PEST CONTROL: PPE VERIFICATIONS
-- Tracks safety gear checks for technicians
-- ============================================

CREATE TABLE IF NOT EXISTS pest_control_ppe_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID REFERENCES employees(id) NOT NULL,
    service_request_id UUID REFERENCES service_requests(id),
    
    -- Verification Data
    items_json JSONB NOT NULL, -- [{"item": "Gloves", "verified": true}, ...]
    status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- pending, verified, failed
    site_readiness_report TEXT,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_pc_ppe_technician ON pest_control_ppe_verifications(technician_id);
CREATE INDEX IF NOT EXISTS idx_pc_ppe_request ON pest_control_ppe_verifications(service_request_id);

-- ============================================
-- 3. PRINTING: AD-SPACE MASTER
-- Tracks society assets used for advertising
-- ============================================

CREATE TABLE IF NOT EXISTS printing_ad_spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_name VARCHAR(100) NOT NULL,                 -- e.g. "Main Lift A"
    location_description TEXT,                        -- e.g. "Inside Main Gate Lift"
    asset_id UUID REFERENCES assets(id),              -- Optional link to physical asset
    dimensions VARCHAR(50),                           -- e.g. "2x3 ft"
    
    -- Financials
    base_rate_paise INTEGER DEFAULT 0 NOT NULL,       -- Monthly rate in paise
    
    -- Status
    status VARCHAR(20) DEFAULT 'available' NOT NULL,  -- available, occupied, maintenance
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_printing_ad_status ON printing_ad_spaces(status);

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE pest_control_chemicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pest_control_ppe_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE printing_ad_spaces ENABLE ROW LEVEL SECURITY;

-- 4.1 Pest Control Chemicals Policies
DO $$ BEGIN
    CREATE POLICY "PC Chemicals viewable by authenticated"
        ON pest_control_chemicals FOR SELECT
        TO authenticated
        USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "PC Chemicals manageable by staff"
        ON pest_control_chemicals FOR ALL
        TO authenticated
        USING (get_user_role() IN ('admin', 'society_manager', 'company_hod'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4.2 PPE Verification Policies
DO $$ BEGIN
    CREATE POLICY "PPE Verifications viewable by staff"
        ON pest_control_ppe_verifications FOR SELECT
        TO authenticated
        USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "PPE Verifications manageable by staff"
        ON pest_control_ppe_verifications FOR ALL
        TO authenticated
        USING (get_user_role() IN ('admin', 'society_manager', 'security_supervisor'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4.3 Ad Space Policies
DO $$ BEGIN
    CREATE POLICY "Ad Spaces viewable by authenticated"
        ON printing_ad_spaces FOR SELECT
        TO authenticated
        USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Ad Spaces manageable by staff"
        ON printing_ad_spaces FOR ALL
        TO authenticated
        USING (get_user_role() IN ('admin', 'society_manager', 'company_hod'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- 5. UPDATED_AT TRIGGER
-- ============================================

DO $$ BEGIN
    CREATE TRIGGER update_pc_chemicals_modtime
        BEFORE UPDATE ON pest_control_chemicals
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_printing_ad_spaces_modtime
        BEFORE UPDATE ON printing_ad_spaces
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
;
