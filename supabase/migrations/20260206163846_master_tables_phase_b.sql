-- ==========================================
-- 1. Inventory & Procurement Masters
-- ==========================================

CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE product_subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
    subcategory_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subcategory_id UUID REFERENCES product_subcategories(id),
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(50) UNIQUE,
    unit VARCHAR(20), -- kg, pcs, ltr, etc.
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gst_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE supplier_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supplier_id, product_id)
);

CREATE TABLE supplier_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_product_id UUID REFERENCES supplier_products(id) ON DELETE CASCADE,
    rate NUMERIC(15, 2) NOT NULL,
    effective_from DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sale_product_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    rate NUMERIC(15, 2) NOT NULL,
    effective_from DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. Facility Services Masters
-- ==========================================

CREATE TABLE vendor_wise_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id),
    service_type VARCHAR(100) NOT NULL, -- AC, Pest, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE work_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE services_wise_work (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_type VARCHAR(100) NOT NULL,
    work_id UUID REFERENCES work_master(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE service_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. Company & HR Masters
-- ==========================================

CREATE TABLE holiday_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    holiday_date DATE NOT NULL,
    holiday_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE company_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_date DATE NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    location_id UUID REFERENCES company_locations(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- RLS Activation
-- ==========================================

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_product_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_wise_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE services_wise_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_events ENABLE ROW LEVEL SECURITY;

-- Simple RLS: Authenticated users can view everything for now
CREATE POLICY "Public read for authenticated users" ON product_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated users" ON product_subcategories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated users" ON products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated users" ON suppliers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated users" ON supplier_products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated users" ON supplier_rates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated users" ON sale_product_rates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated users" ON vendor_wise_services FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated users" ON work_master FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated users" ON services_wise_work FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated users" ON service_tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated users" ON holiday_master FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated users" ON company_events FOR SELECT USING (auth.role() = 'authenticated');;
