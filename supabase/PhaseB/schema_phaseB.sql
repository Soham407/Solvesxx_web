-- ============================================
-- PHASE B: FACILITY & ASSET MANAGEMENT
-- Applied to Supabase: 2026-02-07
-- Depends on: Phase A Schema (roles, employees, company_locations, societies, suppliers, products)
-- ============================================

-- ============================================
-- MIGRATION 01: ENUMS
-- ============================================

-- Asset status enum
CREATE TYPE asset_status AS ENUM (
    'functional',
    'under_maintenance',
    'faulty',
    'decommissioned'
);

-- Service request priority enum
CREATE TYPE service_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);

-- Service request status enum
CREATE TYPE service_request_status AS ENUM (
    'open',
    'assigned',
    'in_progress',
    'on_hold',
    'completed',
    'cancelled'
);

-- Job session status enum
CREATE TYPE job_session_status AS ENUM (
    'started',
    'paused',
    'completed',
    'cancelled'
);

-- Maintenance frequency enum
CREATE TYPE maintenance_frequency AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'half_yearly',
    'yearly'
);

-- ============================================
-- MIGRATION 02: SERVICES TABLE
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
CREATE POLICY "Manage Services" ON services FOR ALL TO authenticated USING (get_user_role() IN ('admin', 'company_hod'));

-- ============================================
-- MIGRATION 03: ASSET CATEGORIES
-- ============================================

CREATE TABLE asset_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_code VARCHAR(20) UNIQUE NOT NULL,           -- e.g., 'HVAC', 'ELEC', 'PLUMB'
    category_name VARCHAR(100) NOT NULL,                 -- e.g., 'HVAC Systems', 'Electrical'
    description TEXT,
    parent_category_id UUID REFERENCES asset_categories(id), -- For hierarchy
    maintenance_frequency_days INTEGER,                  -- Default interval for checks
    icon VARCHAR(50),                                    -- Icon name for UI
    color VARCHAR(7),                                    -- Hex color for UI, e.g., '#FF5733'
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
CREATE POLICY "Delete Asset Categories" ON asset_categories FOR DELETE TO authenticated USING (get_user_role() IN ('admin'));

-- ============================================
-- MIGRATION 04: ASSETS TABLE
-- ============================================

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identification
    asset_code VARCHAR(50) UNIQUE NOT NULL,              -- Sequential ID: "AST-000001"
    name VARCHAR(200) NOT NULL,                          -- e.g., 'Main Gate AC Unit 1'
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
    specifications JSONB DEFAULT '{}',                   -- { "tonnage": "1.5", "gas": "R32", "capacity": "5000L" }
    
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
CREATE POLICY "Delete Assets" ON assets FOR DELETE TO authenticated USING (get_user_role() IN ('admin'));

-- ============================================
-- MIGRATION 05: QR CODES & SCANS
-- ============================================

-- QR Codes (following shelf.nu pattern)
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),      -- This UUID IS the QR content
    
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

-- QR Scan History (for audit trail)
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
CREATE POLICY "View QR Scans" ON qr_scans FOR SELECT TO authenticated USING (get_user_role() IN ('admin', 'company_hod', 'society_manager', 'service_boy'));

-- ============================================
-- MIGRATION 06: MAINTENANCE SCHEDULES
-- ============================================

CREATE TABLE maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Asset link
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
    
    -- Task details
    task_name VARCHAR(200) NOT NULL,
    task_description TEXT,
    
    -- Scheduling
    frequency maintenance_frequency NOT NULL,
    custom_interval_days INTEGER,
    
    -- Tracking
    last_performed_date DATE,
    next_due_date DATE NOT NULL,
    
    -- Assignment
    assigned_to_role UUID REFERENCES roles(id),
    assigned_to_employee UUID REFERENCES employees(id),
    
    -- Notification settings
    reminder_days_before INTEGER DEFAULT 3,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_maintenance_schedules_asset_id ON maintenance_schedules(asset_id);
CREATE INDEX idx_maintenance_schedules_next_due_date ON maintenance_schedules(next_due_date);

-- Enable RLS
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "View Maintenance Schedules" ON maintenance_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage Maintenance Schedules" ON maintenance_schedules FOR ALL TO authenticated USING (get_user_role() IN ('admin', 'company_hod', 'society_manager'));

-- ============================================
-- MIGRATION 07: SERVICE REQUESTS
-- ============================================

CREATE TABLE service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identification
    request_number VARCHAR(50) UNIQUE NOT NULL,          -- Auto-generated: "SR-2026-00001"
    
    -- Service type
    service_id UUID REFERENCES services(id),
    
    -- Asset link (optional)
    asset_id UUID REFERENCES assets(id),
    
    -- Location
    location_id UUID REFERENCES company_locations(id),
    society_id UUID REFERENCES societies(id),
    
    -- Request details
    title VARCHAR(200),
    description TEXT NOT NULL,
    priority service_priority DEFAULT 'normal',
    
    -- Requester
    requester_id UUID REFERENCES auth.users(id),
    requester_phone VARCHAR(20),
    
    -- Assignment
    assigned_to UUID REFERENCES employees(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Scheduling
    scheduled_date DATE,
    scheduled_time TIME,
    estimated_duration_minutes INTEGER,
    
    -- Status tracking
    status service_request_status DEFAULT 'open',
    
    -- Completion
    completed_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Linked maintenance schedule
    maintenance_schedule_id UUID REFERENCES maintenance_schedules(id),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_service_requests_asset_id ON service_requests(asset_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_assigned_to ON service_requests(assigned_to);
CREATE INDEX idx_service_requests_society_id ON service_requests(society_id);
CREATE INDEX idx_service_requests_scheduled_date ON service_requests(scheduled_date);

-- Enable RLS
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "View Assigned or Own Requests" ON service_requests 
    FOR SELECT TO authenticated 
    USING (
        assigned_to IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
        OR requester_id = auth.uid()
        OR get_user_role() IN ('admin', 'company_hod', 'society_manager')
    );

CREATE POLICY "Create Service Requests" ON service_requests 
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Update Assigned Requests" ON service_requests 
    FOR UPDATE TO authenticated 
    USING (
        assigned_to IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
        OR get_user_role() IN ('admin', 'company_hod', 'society_manager')
    );

-- ============================================
-- MIGRATION 08: JOB SESSIONS & PHOTOS
-- ============================================

CREATE TABLE job_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link to request
    service_request_id UUID REFERENCES service_requests(id) NOT NULL,
    
    -- Technician
    technician_id UUID REFERENCES employees(id) NOT NULL,
    
    -- Time tracking
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    
    -- GPS at start
    start_latitude DECIMAL(10, 8),
    start_longitude DECIMAL(11, 8),
    
    -- GPS at end
    end_latitude DECIMAL(10, 8),
    end_longitude DECIMAL(11, 8),
    
    -- Status
    status job_session_status DEFAULT 'started',
    
    -- Notes
    work_performed TEXT,
    remarks TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_job_sessions_service_request_id ON job_sessions(service_request_id);
CREATE INDEX idx_job_sessions_technician_id ON job_sessions(technician_id);
CREATE INDEX idx_job_sessions_status ON job_sessions(status);

-- Enable RLS
ALTER TABLE job_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "View Own Sessions" ON job_sessions 
    FOR SELECT TO authenticated 
    USING (
        technician_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
        OR get_user_role() IN ('admin', 'company_hod', 'society_manager')
    );

CREATE POLICY "Create Sessions" ON job_sessions 
    FOR INSERT TO authenticated 
    WITH CHECK (
        technician_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
        OR get_user_role() IN ('admin', 'company_hod', 'society_manager')
    );

CREATE POLICY "Update Own Sessions" ON job_sessions 
    FOR UPDATE TO authenticated 
    USING (
        technician_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
        OR get_user_role() IN ('admin', 'company_hod', 'society_manager')
    );

-- Job Photos Table
CREATE TABLE job_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link
    job_session_id UUID REFERENCES job_sessions(id) ON DELETE CASCADE NOT NULL,
    
    -- Photo details
    photo_type VARCHAR(20) NOT NULL, -- 'before', 'after', 'part_replaced', 'issue'
    photo_url TEXT NOT NULL,
    caption TEXT,
    
    -- GPS at capture
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Timestamp
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "View Job Photos" ON job_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert Job Photos" ON job_photos FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- MIGRATION 09: INVENTORY & WAREHOUSES
-- ============================================

-- Warehouses
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    warehouse_code VARCHAR(20) UNIQUE NOT NULL,
    warehouse_name VARCHAR(200) NOT NULL,
    
    -- Location link
    location_id UUID REFERENCES company_locations(id),
    society_id UUID REFERENCES societies(id),
    
    -- Management
    manager_id UUID REFERENCES employees(id),
    
    -- Contact
    phone VARCHAR(20),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Warehouses" ON warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage Warehouses" ON warehouses FOR ALL TO authenticated USING (get_user_role() IN ('admin', 'company_hod'));

-- Stock Batches
CREATE TABLE stock_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    batch_number VARCHAR(50) NOT NULL,
    
    -- Product link
    product_id UUID REFERENCES products(id) NOT NULL,
    
    -- Warehouse link
    warehouse_id UUID REFERENCES warehouses(id) NOT NULL,
    
    -- Quantity tracking
    initial_quantity DECIMAL(10, 2) NOT NULL,
    current_quantity DECIMAL(10, 2) NOT NULL,
    
    -- Batch details
    manufacturing_date DATE,
    expiry_date DATE,
    
    -- Cost
    unit_cost DECIMAL(10, 2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',               -- 'active', 'depleted', 'expired', 'returned'
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(batch_number, product_id, warehouse_id)
);

-- Indexes
CREATE INDEX idx_stock_batches_product_id ON stock_batches(product_id);
CREATE INDEX idx_stock_batches_warehouse_id ON stock_batches(warehouse_id);
CREATE INDEX idx_stock_batches_expiry_date ON stock_batches(expiry_date);

-- Enable RLS
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Stock Batches" ON stock_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage Stock Batches" ON stock_batches FOR ALL TO authenticated USING (get_user_role() IN ('admin', 'company_hod', 'account'));

-- Job Materials Used
CREATE TABLE job_materials_used (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Links
    job_session_id UUID REFERENCES job_sessions(id) NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    stock_batch_id UUID REFERENCES stock_batches(id),
    
    -- Quantity
    quantity DECIMAL(10, 2) NOT NULL,
    
    -- Unit cost at time of use
    unit_cost DECIMAL(10, 2),
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_job_materials_used_job_session_id ON job_materials_used(job_session_id);

-- Enable RLS
ALTER TABLE job_materials_used ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert Job Materials" ON job_materials_used FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "View Job Materials" ON job_materials_used FOR SELECT TO authenticated USING (true);

-- Reorder Rules
CREATE TABLE reorder_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    product_id UUID REFERENCES products(id) NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id),
    
    -- Levels
    reorder_level DECIMAL(10, 2) NOT NULL,
    reorder_quantity DECIMAL(10, 2) NOT NULL,
    max_stock_level DECIMAL(10, 2),
    
    -- Lead time
    lead_time_days INTEGER DEFAULT 7,
    
    -- Auto-order settings
    auto_reorder BOOLEAN DEFAULT false,
    preferred_supplier_id UUID REFERENCES suppliers(id),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_id, warehouse_id)
);

-- Enable RLS
ALTER TABLE reorder_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage Reorder Rules" ON reorder_rules FOR ALL TO authenticated USING (get_user_role() IN ('admin', 'company_hod', 'account'));

-- ============================================
-- MIGRATION 10: TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_phase_b_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Apply triggers
CREATE TRIGGER trigger_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

CREATE TRIGGER trigger_asset_categories_updated_at
    BEFORE UPDATE ON asset_categories
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

CREATE TRIGGER trigger_maintenance_schedules_updated_at
    BEFORE UPDATE ON maintenance_schedules
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

CREATE TRIGGER trigger_service_requests_updated_at
    BEFORE UPDATE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

CREATE TRIGGER trigger_job_sessions_updated_at
    BEFORE UPDATE ON job_sessions
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

CREATE TRIGGER trigger_warehouses_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

CREATE TRIGGER trigger_stock_batches_updated_at
    BEFORE UPDATE ON stock_batches
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

CREATE TRIGGER trigger_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

-- Auto-generate service request number
CREATE OR REPLACE FUNCTION generate_service_request_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_number INTEGER;
    year_part TEXT;
BEGIN
    year_part := to_char(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(request_number FROM 'SR-' || year_part || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM service_requests
    WHERE request_number LIKE 'SR-' || year_part || '-%';
    
    NEW.request_number := 'SR-' || year_part || '-' || LPAD(next_number::TEXT, 5, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_service_request_number
    BEFORE INSERT ON service_requests
    FOR EACH ROW
    WHEN (NEW.request_number IS NULL)
    EXECUTE FUNCTION generate_service_request_number();

-- Auto-generate asset code
CREATE OR REPLACE FUNCTION generate_asset_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(asset_code FROM 'AST-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM assets;
    
    NEW.asset_code := 'AST-' || LPAD(next_number::TEXT, 6, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_asset_code
    BEFORE INSERT ON assets
    FOR EACH ROW
    WHEN (NEW.asset_code IS NULL)
    EXECUTE FUNCTION generate_asset_code();

-- Auto-create QR code when asset is created
CREATE OR REPLACE FUNCTION create_qr_for_asset()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO qr_codes (asset_id, society_id, claimed_by, claimed_at, created_by)
    VALUES (NEW.id, NEW.society_id, NEW.created_by, CURRENT_TIMESTAMP, NEW.created_by);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_qr_for_asset
    AFTER INSERT ON assets
    FOR EACH ROW EXECUTE FUNCTION create_qr_for_asset();

-- Deduct stock when materials used
CREATE OR REPLACE FUNCTION deduct_stock_on_material_use()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.stock_batch_id IS NOT NULL THEN
        UPDATE stock_batches
        SET current_quantity = current_quantity - NEW.quantity,
            status = CASE 
                WHEN current_quantity - NEW.quantity <= 0 THEN 'depleted'
                ELSE status
            END
        WHERE id = NEW.stock_batch_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_deduct_stock
    AFTER INSERT ON job_materials_used
    FOR EACH ROW EXECUTE FUNCTION deduct_stock_on_material_use();

-- ============================================
-- MIGRATION 11 & 12: VIEWS (SECURITY INVOKER)
-- ============================================

-- Assets with QR codes and location details
CREATE VIEW assets_with_details 
WITH (security_invoker = on) AS
SELECT 
    a.*,
    ac.category_name,
    ac.category_code,
    cl.location_name,
    cl.location_code,
    s.supplier_name AS vendor_name,
    (SELECT id FROM qr_codes WHERE asset_id = a.id LIMIT 1) AS qr_id
FROM assets a
LEFT JOIN asset_categories ac ON a.category_id = ac.id
LEFT JOIN company_locations cl ON a.location_id = cl.id
LEFT JOIN suppliers s ON a.vendor_id = s.id;

-- Service requests with asset and technician details
CREATE VIEW service_requests_with_details 
WITH (security_invoker = on) AS
SELECT 
    sr.*,
    a.name AS asset_name,
    a.asset_code,
    e.first_name || ' ' || e.last_name AS technician_name,
    cl.location_name,
    sv.service_name
FROM service_requests sr
LEFT JOIN assets a ON sr.asset_id = a.id
LEFT JOIN employees e ON sr.assigned_to = e.id
LEFT JOIN company_locations cl ON sr.location_id = cl.id
LEFT JOIN services sv ON sr.service_id = sv.id;

-- Due maintenance schedules
CREATE VIEW due_maintenance_schedules 
WITH (security_invoker = on) AS
SELECT 
    ms.*,
    a.name AS asset_name,
    a.asset_code,
    a.location_id,
    cl.location_name
FROM maintenance_schedules ms
JOIN assets a ON ms.asset_id = a.id
LEFT JOIN company_locations cl ON a.location_id = cl.id
WHERE ms.is_active = true
  AND ms.next_due_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY ms.next_due_date;

-- Stock level view
CREATE VIEW stock_levels 
WITH (security_invoker = on) AS
SELECT 
    p.id AS product_id,
    p.product_name,
    p.product_code,
    w.id AS warehouse_id,
    w.warehouse_name,
    COALESCE(SUM(sb.current_quantity), 0) AS total_quantity,
    rr.reorder_level,
    CASE 
        WHEN COALESCE(SUM(sb.current_quantity), 0) <= COALESCE(rr.reorder_level, 0) THEN true
        ELSE false
    END AS needs_reorder
FROM products p
CROSS JOIN warehouses w
LEFT JOIN stock_batches sb ON p.id = sb.product_id AND w.id = sb.warehouse_id AND sb.status = 'active'
LEFT JOIN reorder_rules rr ON p.id = rr.product_id AND w.id = rr.warehouse_id
GROUP BY p.id, p.product_name, p.product_code, w.id, w.warehouse_name, rr.reorder_level;

-- ============================================
-- END OF PHASE B SCHEMA
-- ============================================

COMMENT ON SCHEMA public IS 'Facility Management & Services System - Phase B: Asset & Service Management';