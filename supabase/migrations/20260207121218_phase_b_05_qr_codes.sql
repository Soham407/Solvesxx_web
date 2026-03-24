-- ============================================
-- PHASE B MIGRATION 05: QR CODES TABLE
-- ============================================

CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link to asset (nullable for orphaned/unclaimed QRs)
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    
    -- Organization context
    society_id UUID REFERENCES societies(id),
    
    -- Ownership
    claimed_by UUID REFERENCES auth.users(id),
    claimed_at TIMESTAMP WITH TIME ZONE,
    
    -- QR generation details
    version INTEGER DEFAULT 0,
    
    -- Print batch tracking
    print_batch_id UUID,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_qr_codes_asset_id ON qr_codes(asset_id);
CREATE INDEX idx_qr_codes_society_id ON qr_codes(society_id);

-- Enable RLS
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "View QR Codes" ON qr_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage QR Codes" ON qr_codes FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('admin', 'company_hod', 'society_manager'));
CREATE POLICY "Update QR Codes" ON qr_codes FOR UPDATE TO authenticated USING (true);

-- ============================================
-- QR SCANS TABLE
-- ============================================

CREATE TABLE qr_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_id UUID REFERENCES qr_codes(id) NOT NULL,
    
    -- Who scanned
    scanned_by UUID REFERENCES auth.users(id),
    
    -- Location at scan time
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Device info
    user_agent TEXT,
    ip_address INET,
    
    -- Timestamp
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_qr_scans_qr_id ON qr_scans(qr_id);
CREATE INDEX idx_qr_scans_scanned_at ON qr_scans(scanned_at);

-- Enable RLS
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Insert QR Scans" ON qr_scans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "View QR Scans" ON qr_scans FOR SELECT TO authenticated USING (get_user_role() IN ('admin', 'company_hod', 'society_manager', 'service_boy'));;
