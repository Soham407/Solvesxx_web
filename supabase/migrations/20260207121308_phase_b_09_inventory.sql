-- ============================================
-- PHASE B MIGRATION 09: WAREHOUSES & INVENTORY
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
    status VARCHAR(20) DEFAULT 'active',
    
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

CREATE POLICY "Manage Reorder Rules" ON reorder_rules FOR ALL TO authenticated USING (get_user_role() IN ('admin', 'company_hod', 'account'));;
