-- ============================================
-- PHASE B MIGRATION 02: SERVICES TABLE
-- (Required for service_requests FK)
-- ============================================

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_code VARCHAR(20) UNIQUE NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    service_category VARCHAR(50), -- 'security', 'maintenance', 'housekeeping', etc.
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "View Services" ON services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage Services" ON services FOR ALL TO authenticated USING (get_user_role() IN ('admin', 'company_hod'));;
