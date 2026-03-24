-- ============================================
-- PHASE B MIGRATION 03: ASSET CATEGORIES
-- ============================================

CREATE TABLE asset_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_code VARCHAR(20) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES asset_categories(id),
    maintenance_frequency_days INTEGER,
    icon VARCHAR(50),
    color VARCHAR(7),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Index for hierarchy lookup
CREATE INDEX idx_asset_categories_parent ON asset_categories(parent_category_id);

-- Enable RLS
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "View Asset Categories" ON asset_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert Asset Categories" ON asset_categories FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('admin', 'company_hod', 'society_manager'));
CREATE POLICY "Update Asset Categories" ON asset_categories FOR UPDATE TO authenticated USING (get_user_role() IN ('admin', 'company_hod', 'society_manager'));
CREATE POLICY "Delete Asset Categories" ON asset_categories FOR DELETE TO authenticated USING (get_user_role() IN ('admin'));;
