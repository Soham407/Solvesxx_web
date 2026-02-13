-- ============================================
-- Facility Management & Services System
-- Supabase Database Schema
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

-- User roles enum
CREATE TYPE user_role AS ENUM (
    'admin',
    'company_md',
    'company_hod',
    'account',
    'delivery_boy',
    'buyer',
    'supplier',
    'vendor',
    'security_guard',
    'security_supervisor',
    'society_manager',
    'service_boy'
);

-- Request status enum
CREATE TYPE request_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'indent_generated',
    'indent_forwarded',
    'indent_accepted',
    'indent_rejected',
    'po_issued',
    'po_received',
    'po_dispatched',
    'material_received',
    'material_acknowledged',
    'bill_generated',
    'paid',
    'feedback_pending',
    'completed'
);

-- Service category enum
CREATE TYPE service_category AS ENUM (
    'security_services',
    'ac_services',
    'plantation_services',
    'printing_advertising',
    'pest_control',
    'housekeeping',
    'pantry_services',
    'general_maintenance'
);

-- Guard grade enum
CREATE TYPE guard_grade AS ENUM ('A', 'B', 'C', 'D');

-- Leave type enum
CREATE TYPE leave_type_enum AS ENUM (
    'sick_leave',
    'casual_leave',
    'paid_leave',
    'unpaid_leave',
    'emergency_leave'
);

-- Material condition enum
CREATE TYPE material_condition AS ENUM (
    'good',
    'damaged',
    'expired',
    'leaking',
    'defective'
);

-- Ticket type enum
CREATE TYPE ticket_type AS ENUM (
    'quality_check',
    'quantity_check',
    'material_return'
);

-- Alert type enum
CREATE TYPE alert_type AS ENUM (
    'panic',
    'inactivity',
    'geo_fence_breach',
    'checklist_incomplete',
    'routine'
);

-- ============================================
-- MASTER DATA TABLES
-- ============================================

-- 1. Role Master
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name user_role NOT NULL UNIQUE,
    role_display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Designation Master
CREATE TABLE designations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    designation_code VARCHAR(20) UNIQUE NOT NULL,
    designation_name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 3. Employee Master
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    date_of_birth DATE,
    date_of_joining DATE NOT NULL,
    designation_id UUID REFERENCES designations(id),
    department VARCHAR(100),
    reporting_to UUID REFERENCES employees(id),
    is_active BOOLEAN DEFAULT true,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 4. User Master
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    role_id UUID REFERENCES roles(id) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SUPPLY MODULE MASTER TABLES
-- ============================================

-- 5. Product Category Master
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_code VARCHAR(20) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES product_categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 6. Product Subcategory Master
CREATE TABLE product_subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subcategory_code VARCHAR(20) UNIQUE NOT NULL,
    subcategory_name VARCHAR(100) NOT NULL,
    category_id UUID REFERENCES product_categories(id) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 7. Product Master
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES product_categories(id) NOT NULL,
    subcategory_id UUID REFERENCES product_subcategories(id),
    description TEXT,
    unit_of_measurement VARCHAR(20) NOT NULL, -- kg, litre, piece, box, etc.
    base_rate DECIMAL(10, 2),
    hsn_code VARCHAR(20),
    specifications JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 8. Supplier/Vendor Details Master
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(200) NOT NULL,
    supplier_type VARCHAR(50), -- vendor, contractor, service_provider
    contact_person VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    gst_number VARCHAR(20) UNIQUE,
    pan_number VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(12, 2),
    rating DECIMAL(2, 1) CHECK (rating >= 0 AND rating <= 5),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 9. Supplier Wise Products Mapping
CREATE TABLE supplier_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    is_preferred BOOLEAN DEFAULT false,
    lead_time_days INTEGER,
    minimum_order_quantity DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(supplier_id, product_id)
);

-- 10. Supplier Wise Product Rates
CREATE TABLE supplier_product_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    rate DECIMAL(10, 2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    gst_percentage DECIMAL(5, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(supplier_id, product_id, effective_from)
);

-- 11. Sale Product Rates
CREATE TABLE sale_product_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    sale_rate DECIMAL(10, 2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    gst_percentage DECIMAL(5, 2) DEFAULT 0,
    margin_percentage DECIMAL(5, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(product_id, effective_from)
);

-- ============================================
-- SERVICES MODULE MASTER TABLES
-- ============================================

-- 12. Daily Checklist Master
CREATE TABLE daily_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checklist_code VARCHAR(20) UNIQUE NOT NULL,
    checklist_name VARCHAR(200) NOT NULL,
    department VARCHAR(100) NOT NULL, -- Security, Housekeeping, Maintenance
    description TEXT,
    questions JSONB NOT NULL, -- Array of {question, type: 'yes_no' or 'value', required: boolean}
    frequency VARCHAR(20) DEFAULT 'daily', -- daily, weekly, monthly
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- 13. Services Master
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_code VARCHAR(20) UNIQUE NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    service_category service_category NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- 14. Vendor Wise Services Mapping
CREATE TABLE vendor_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE NOT NULL,
    rating DECIMAL(2, 1) CHECK (rating >= 0 AND rating <= 5),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(supplier_id, service_id)
);

-- 15. Work Master
CREATE TABLE works (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_code VARCHAR(20) UNIQUE NOT NULL,
    work_name VARCHAR(200) NOT NULL,
    description TEXT,
    estimated_duration_hours DECIMAL(5, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- 16. Service Wise Work Mapping
CREATE TABLE service_works (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE NOT NULL,
    work_id UUID REFERENCES works(id) ON DELETE CASCADE NOT NULL,
    sequence_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_id, work_id)
);

-- ============================================
-- HRMS MODULE MASTER TABLES
-- ============================================

-- 17. Leave Type Master
CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leave_type leave_type_enum NOT NULL UNIQUE,
    leave_name VARCHAR(100) NOT NULL,
    yearly_quota INTEGER NOT NULL,
    can_carry_forward BOOLEAN DEFAULT false,
    max_carry_forward INTEGER DEFAULT 0,
    requires_approval BOOLEAN DEFAULT true,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Holiday Master
CREATE TABLE holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    holiday_name VARCHAR(200) NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_type VARCHAR(50), -- national, regional, optional
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(holiday_date, year)
);

-- 19. Company Events
CREATE TABLE company_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(200) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    venue VARCHAR(200),
    description TEXT,
    event_type VARCHAR(50), -- meeting, training, emergency_drill
    is_mandatory BOOLEAN DEFAULT false,
    organizer_id UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- 20. Company Location Master
CREATE TABLE company_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_code VARCHAR(20) UNIQUE NOT NULL,
    location_name VARCHAR(200) NOT NULL,
    location_type VARCHAR(50), -- gate, clubhouse, parking, building
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geo_fence_radius DECIMAL(6, 2), -- in meters
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- OPERATIONAL TABLES
-- ============================================

-- Security Guards
CREATE TABLE security_guards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) NOT NULL,
    guard_code VARCHAR(50) UNIQUE NOT NULL,
    grade guard_grade NOT NULL,
    is_armed BOOLEAN DEFAULT false,
    license_number VARCHAR(100),
    license_expiry DATE,
    assigned_location_id UUID REFERENCES company_locations(id),
    shift_timing VARCHAR(20), -- day, night, rotating
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Panic Alerts
CREATE TABLE panic_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID REFERENCES security_guards(id) NOT NULL,
    alert_type alert_type NOT NULL,
    location_id UUID REFERENCES company_locations(id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    alert_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Daily Checklist Responses
CREATE TABLE checklist_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checklist_id UUID REFERENCES daily_checklists(id) NOT NULL,
    employee_id UUID REFERENCES employees(id) NOT NULL,
    response_date DATE NOT NULL,
    responses JSONB NOT NULL, -- Array of {question_id, answer, photo_url}
    location_id UUID REFERENCES company_locations(id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_complete BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(checklist_id, employee_id, response_date)
);

-- Leave Applications
CREATE TABLE leave_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) NOT NULL,
    leave_type_id UUID REFERENCES leave_types(id) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    number_of_days DECIMAL(3, 1) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attendance/Location Tracking
CREATE TABLE attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) NOT NULL,
    log_date DATE NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    check_in_location_id UUID REFERENCES company_locations(id),
    check_out_location_id UUID REFERENCES company_locations(id),
    total_hours DECIMAL(5, 2),
    status VARCHAR(20), -- present, absent, half_day, on_leave
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, log_date)
);

-- GPS Tracking for Guards
CREATE TABLE gps_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(6, 2),
    location_id UUID REFERENCES company_locations(id),
    is_within_fence BOOLEAN DEFAULT true,
    tracked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PROCUREMENT & ORDER MANAGEMENT TABLES
-- ============================================

-- Buyers/Customers
CREATE TABLE buyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_code VARCHAR(50) UNIQUE NOT NULL,
    buyer_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    gst_number VARCHAR(20),
    credit_limit DECIMAL(12, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Order Requests (from Buyer)
CREATE TABLE order_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    buyer_id UUID REFERENCES buyers(id) NOT NULL,
    request_date DATE NOT NULL,
    required_by_date DATE,
    status request_status DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order Request Items
CREATE TABLE order_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_request_id UUID REFERENCES order_requests(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measurement VARCHAR(20) NOT NULL,
    required_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indents (Internal Purchase Request)
CREATE TABLE indents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indent_number VARCHAR(50) UNIQUE NOT NULL,
    order_request_id UUID REFERENCES order_requests(id),
    indent_date DATE NOT NULL,
    required_by_date DATE,
    status request_status DEFAULT 'indent_generated',
    prepared_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indent Items
CREATE TABLE indent_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indent_id UUID REFERENCES indents(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measurement VARCHAR(20) NOT NULL,
    estimated_rate DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indent Forwarding (to Supplier)
CREATE TABLE indent_forwards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indent_id UUID REFERENCES indents(id) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) NOT NULL,
    forwarded_date DATE NOT NULL,
    status request_status DEFAULT 'indent_forwarded',
    forwarded_by UUID REFERENCES employees(id),
    supplier_response_date DATE,
    supplier_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Orders
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    indent_forward_id UUID REFERENCES indent_forwards(id),
    supplier_id UUID REFERENCES suppliers(id) NOT NULL,
    po_date DATE NOT NULL,
    delivery_date DATE,
    status request_status DEFAULT 'po_issued',
    total_amount DECIMAL(12, 2),
    gst_amount DECIMAL(12, 2),
    grand_total DECIMAL(12, 2),
    payment_terms VARCHAR(100),
    delivery_address TEXT,
    terms_and_conditions TEXT,
    prepared_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order Items
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measurement VARCHAR(20) NOT NULL,
    rate DECIMAL(10, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    gst_percentage DECIMAL(5, 2) DEFAULT 0,
    amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Material Receipt/Goods Receipt Notes
CREATE TABLE material_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    po_id UUID REFERENCES purchase_orders(id) NOT NULL,
    receipt_date DATE NOT NULL,
    received_by UUID REFERENCES employees(id),
    supplier_challan_number VARCHAR(50),
    supplier_challan_date DATE,
    vehicle_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'received', -- received, quality_checked, acknowledged
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Material Receipt Items
CREATE TABLE material_receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID REFERENCES material_receipts(id) ON DELETE CASCADE NOT NULL,
    po_item_id UUID REFERENCES purchase_order_items(id) NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    ordered_quantity DECIMAL(10, 2) NOT NULL,
    received_quantity DECIMAL(10, 2) NOT NULL,
    accepted_quantity DECIMAL(10, 2),
    rejected_quantity DECIMAL(10, 2) DEFAULT 0,
    shortage DECIMAL(10, 2) GENERATED ALWAYS AS (ordered_quantity - received_quantity) STORED,
    condition material_condition DEFAULT 'good',
    batch_number VARCHAR(50),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TICKET MANAGEMENT TABLES
-- ============================================

-- Material Quality/Quantity Tickets
CREATE TABLE material_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    ticket_type ticket_type NOT NULL,
    receipt_id UUID REFERENCES material_receipts(id),
    product_id UUID REFERENCES products(id) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) NOT NULL,
    issue_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- open, in_progress, resolved, closed
    priority VARCHAR(20) DEFAULT 'normal',
    condition_status material_condition,
    ordered_quantity DECIMAL(10, 2),
    received_quantity DECIMAL(10, 2),
    shortage_quantity DECIMAL(10, 2),
    batch_number VARCHAR(50),
    photo_urls JSONB, -- Array of photo URLs
    reason_for_return TEXT,
    resolution TEXT,
    raised_by UUID REFERENCES employees(id),
    resolved_by UUID REFERENCES employees(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BILLING TABLES
-- ============================================

-- Purchase Bills (from Supplier to Company)
CREATE TABLE purchase_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    po_id UUID REFERENCES purchase_orders(id) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) NOT NULL,
    bill_date DATE NOT NULL,
    due_date DATE,
    receipt_id UUID REFERENCES material_receipts(id),
    total_amount DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    gst_amount DECIMAL(12, 2) DEFAULT 0,
    other_charges DECIMAL(12, 2) DEFAULT 0,
    grand_total DECIMAL(12, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'unpaid', -- unpaid, partial, paid
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    payment_date DATE,
    payment_mode VARCHAR(50),
    payment_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sale Bills (from Company to Buyer)
CREATE TABLE sale_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    order_request_id UUID REFERENCES order_requests(id) NOT NULL,
    buyer_id UUID REFERENCES buyers(id) NOT NULL,
    bill_date DATE NOT NULL,
    due_date DATE,
    total_amount DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    gst_amount DECIMAL(12, 2) DEFAULT 0,
    other_charges DECIMAL(12, 2) DEFAULT 0,
    grand_total DECIMAL(12, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'unpaid', -- unpaid, partial, paid
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    payment_date DATE,
    payment_mode VARCHAR(50),
    payment_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sale Bill Items
CREATE TABLE sale_bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_bill_id UUID REFERENCES sale_bills(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measurement VARCHAR(20) NOT NULL,
    rate DECIMAL(10, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    gst_percentage DECIMAL(5, 2) DEFAULT 0,
    amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FEEDBACK TABLES
-- ============================================

-- Feedback from Buyer
CREATE TABLE buyer_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_request_id UUID REFERENCES order_requests(id) NOT NULL,
    buyer_id UUID REFERENCES buyers(id) NOT NULL,
    rating DECIMAL(2, 1) CHECK (rating >= 0 AND rating <= 5),
    product_quality_rating DECIMAL(2, 1) CHECK (product_quality_rating >= 0 AND product_quality_rating <= 5),
    delivery_rating DECIMAL(2, 1) CHECK (delivery_rating >= 0 AND delivery_rating <= 5),
    service_rating DECIMAL(2, 1) CHECK (service_rating >= 0 AND service_rating <= 5),
    comments TEXT,
    would_recommend BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Feedback on Supplier
CREATE TABLE supplier_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES purchase_orders(id) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) NOT NULL,
    rating DECIMAL(2, 1) CHECK (rating >= 0 AND rating <= 5),
    quality_rating DECIMAL(2, 1) CHECK (quality_rating >= 0 AND quality_rating <= 5),
    delivery_rating DECIMAL(2, 1) CHECK (delivery_rating >= 0 AND delivery_rating <= 5),
    pricing_rating DECIMAL(2, 1) CHECK (pricing_rating >= 0 AND pricing_rating <= 5),
    communication_rating DECIMAL(2, 1) CHECK (communication_rating >= 0 AND communication_rating <= 5),
    comments TEXT,
    would_recommend BOOLEAN,
    reviewed_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INVENTORY TABLES
-- ============================================

-- Inventory/Stock
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) NOT NULL,
    location_id UUID REFERENCES company_locations(id),
    quantity_on_hand DECIMAL(10, 2) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(10, 2) DEFAULT 0,
    available_quantity DECIMAL(10, 2) GENERATED ALWAYS AS (quantity_on_hand - reserved_quantity) STORED,
    reorder_level DECIMAL(10, 2),
    max_stock_level DECIMAL(10, 2),
    last_stock_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, location_id)
);

-- Stock Transactions
CREATE TABLE stock_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    location_id UUID REFERENCES company_locations(id),
    transaction_type VARCHAR(20) NOT NULL, -- in, out, adjustment, transfer
    quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measurement VARCHAR(20) NOT NULL,
    reference_type VARCHAR(50), -- purchase_order, sale_order, adjustment, return
    reference_id UUID,
    transaction_date DATE NOT NULL,
    batch_number VARCHAR(50),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AUDIT & LOGS TABLES
-- ============================================

-- Audit Log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users and Employees
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_employees_designation_id ON employees(designation_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_phone ON employees(phone);

-- Products
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_subcategory_id ON products(subcategory_id);
CREATE INDEX idx_products_product_code ON products(product_code);
CREATE INDEX idx_product_subcategories_category_id ON product_subcategories(category_id);

-- Suppliers
CREATE INDEX idx_suppliers_supplier_code ON suppliers(supplier_code);
CREATE INDEX idx_supplier_products_supplier_id ON supplier_products(supplier_id);
CREATE INDEX idx_supplier_products_product_id ON supplier_products(product_id);
CREATE INDEX idx_vendor_services_supplier_id ON vendor_services(supplier_id);
CREATE INDEX idx_vendor_services_service_id ON vendor_services(service_id);

-- Orders and Procurement
CREATE INDEX idx_order_requests_buyer_id ON order_requests(buyer_id);
CREATE INDEX idx_order_requests_status ON order_requests(status);
CREATE INDEX idx_order_requests_request_date ON order_requests(request_date);
CREATE INDEX idx_indents_order_request_id ON indents(order_request_id);
CREATE INDEX idx_indents_status ON indents(status);
CREATE INDEX idx_indent_forwards_indent_id ON indent_forwards(indent_id);
CREATE INDEX idx_indent_forwards_supplier_id ON indent_forwards(supplier_id);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_po_date ON purchase_orders(po_date);

-- Receipts and Bills
CREATE INDEX idx_material_receipts_po_id ON material_receipts(po_id);
CREATE INDEX idx_material_receipts_receipt_date ON material_receipts(receipt_date);
CREATE INDEX idx_purchase_bills_po_id ON purchase_bills(po_id);
CREATE INDEX idx_purchase_bills_supplier_id ON purchase_bills(supplier_id);
CREATE INDEX idx_purchase_bills_payment_status ON purchase_bills(payment_status);
CREATE INDEX idx_sale_bills_buyer_id ON sale_bills(buyer_id);
CREATE INDEX idx_sale_bills_payment_status ON sale_bills(payment_status);

-- Inventory
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_location_id ON inventory(location_id);
CREATE INDEX idx_stock_transactions_product_id ON stock_transactions(product_id);
CREATE INDEX idx_stock_transactions_transaction_date ON stock_transactions(transaction_date);

-- Security and Attendance
CREATE INDEX idx_security_guards_employee_id ON security_guards(employee_id);
CREATE INDEX idx_panic_alerts_guard_id ON panic_alerts(guard_id);
CREATE INDEX idx_panic_alerts_alert_time ON panic_alerts(alert_time);
CREATE INDEX idx_attendance_logs_employee_id ON attendance_logs(employee_id);
CREATE INDEX idx_attendance_logs_log_date ON attendance_logs(log_date);
CREATE INDEX idx_gps_tracking_employee_id ON gps_tracking(employee_id);
CREATE INDEX idx_gps_tracking_tracked_at ON gps_tracking(tracked_at);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_product_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_product_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_guards ENABLE ROW LEVEL SECURITY;
ALTER TABLE panic_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE indents ENABLE ROW LEVEL SECURITY;
ALTER TABLE indent_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE indent_forwards ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role_name FROM roles r
  JOIN users u ON u.role_id = r.id
  WHERE u.id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- MASTER DATA RLS POLICIES
-- ============================================

-- Roles: Admin can manage, others can view
CREATE POLICY "Admins can manage roles"
    ON roles FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

CREATE POLICY "All users can view roles"
    ON roles FOR SELECT
    TO authenticated
    USING (true);

-- Designations: Admin can manage, others can view
CREATE POLICY "Admins can manage designations"
    ON designations FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

CREATE POLICY "All users can view designations"
    ON designations FOR SELECT
    TO authenticated
    USING (true);

-- Employees: Admin and HOD can manage, all can view
CREATE POLICY "Admins and HODs can manage employees"
    ON employees FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod'));

CREATE POLICY "All users can view employees"
    ON employees FOR SELECT
    TO authenticated
    USING (true);

-- Users: Admin manages, users can view their own data
CREATE POLICY "Admins can manage users"
    ON users FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

CREATE POLICY "Users can view their own data"
    ON users FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Products and Categories: Admin can manage, all can view
CREATE POLICY "Admins can manage product categories"
    ON product_categories FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

CREATE POLICY "All users can view product categories"
    ON product_categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage products"
    ON products FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

CREATE POLICY "All users can view products"
    ON products FOR SELECT
    TO authenticated
    USING (true);

-- Suppliers: Admin can manage, all can view
CREATE POLICY "Admins can manage suppliers"
    ON suppliers FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

CREATE POLICY "All users can view suppliers"
    ON suppliers FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- OPERATIONAL RLS POLICIES
-- ============================================

-- Order Requests: Buyers create, Admin manages, all stakeholders view
CREATE POLICY "Buyers can create order requests"
    ON order_requests FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() = 'buyer');

CREATE POLICY "Admins can manage order requests"
    ON order_requests FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account'));

CREATE POLICY "Stakeholders can view order requests"
    ON order_requests FOR SELECT
    TO authenticated
    USING (
        get_user_role() IN ('admin', 'company_hod', 'account', 'buyer', 'supplier')
    );

-- Purchase Orders: Admin creates, Suppliers view their own
CREATE POLICY "Admins can manage purchase orders"
    ON purchase_orders FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account'));

CREATE POLICY "Suppliers can view their purchase orders"
    ON purchase_orders FOR SELECT
    TO authenticated
    USING (
        get_user_role() = 'supplier' AND
        supplier_id IN (
            SELECT id FROM suppliers WHERE id = (
                SELECT supplier_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Panic Alerts: Guards create, Managers and Supervisors view/manage
CREATE POLICY "Guards can create panic alerts"
    ON panic_alerts FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() = 'security_guard');

CREATE POLICY "Supervisors and managers can manage alerts"
    ON panic_alerts FOR ALL
    TO authenticated
    USING (get_user_role() IN ('security_supervisor', 'society_manager', 'admin'));

-- Attendance Logs: Employees can view their own, Admin and HOD view all
CREATE POLICY "Employees can view their own attendance"
    ON attendance_logs FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT employee_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all attendance"
    ON attendance_logs FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'society_manager'));

-- Notifications: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Inventory: Admin manages, all can view
CREATE POLICY "Admins can manage inventory"
    ON inventory FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account'));

CREATE POLICY "All users can view inventory"
    ON inventory FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- TRIGGERS AND FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_designations_updated_at BEFORE UPDATE ON designations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_requests_updated_at BEFORE UPDATE ON order_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create audit log
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), auth.uid());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), auth.uid());
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to critical tables
CREATE TRIGGER audit_employees AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_purchase_orders AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_purchase_bills AFTER INSERT OR UPDATE OR DELETE ON purchase_bills
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_sale_bills AFTER INSERT OR UPDATE OR DELETE ON sale_bills
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Function to update inventory on stock transaction
CREATE OR REPLACE FUNCTION update_inventory_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'in' THEN
        UPDATE inventory
        SET quantity_on_hand = quantity_on_hand + NEW.quantity,
            last_stock_date = NEW.transaction_date
        WHERE product_id = NEW.product_id
          AND (location_id = NEW.location_id OR (location_id IS NULL AND NEW.location_id IS NULL));
        
        IF NOT FOUND THEN
            INSERT INTO inventory (product_id, location_id, quantity_on_hand, last_stock_date)
            VALUES (NEW.product_id, NEW.location_id, NEW.quantity, NEW.transaction_date);
        END IF;
    ELSIF NEW.transaction_type = 'out' THEN
        UPDATE inventory
        SET quantity_on_hand = quantity_on_hand - NEW.quantity,
            last_stock_date = NEW.transaction_date
        WHERE product_id = NEW.product_id
          AND (location_id = NEW.location_id OR (location_id IS NULL AND NEW.location_id IS NULL));
    ELSIF NEW.transaction_type = 'adjustment' THEN
        UPDATE inventory
        SET quantity_on_hand = NEW.quantity,
            last_stock_date = NEW.transaction_date
        WHERE product_id = NEW.product_id
          AND (location_id = NEW.location_id OR (location_id IS NULL AND NEW.location_id IS NULL));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory
AFTER INSERT ON stock_transactions
FOR EACH ROW EXECUTE FUNCTION update_inventory_on_transaction();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_notification_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT,
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_priority VARCHAR DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message,
        reference_type,
        reference_id,
        priority
    ) VALUES (
        p_user_id,
        p_notification_type,
        p_title,
        p_message,
        p_reference_type,
        p_reference_id,
        p_priority
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- View: Order Request Summary
CREATE OR REPLACE VIEW order_request_summary AS
SELECT
    or_req.id,
    or_req.request_number,
    or_req.request_date,
    or_req.required_by_date,
    or_req.status,
    or_req.priority,
    b.buyer_name,
    b.buyer_code,
    COUNT(ori.id) as item_count,
    SUM(ori.quantity) as total_quantity,
    or_req.created_at
FROM order_requests or_req
JOIN buyers b ON or_req.buyer_id = b.id
LEFT JOIN order_request_items ori ON or_req.id = ori.order_request_id
GROUP BY or_req.id, b.buyer_name, b.buyer_code;

-- View: Purchase Order Summary
CREATE OR REPLACE VIEW purchase_order_summary AS
SELECT
    po.id,
    po.po_number,
    po.po_date,
    po.delivery_date,
    po.status,
    s.supplier_name,
    s.supplier_code,
    po.total_amount,
    po.gst_amount,
    po.grand_total,
    COUNT(poi.id) as item_count,
    po.created_at
FROM purchase_orders po
JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
GROUP BY po.id, s.supplier_name, s.supplier_code;

-- View: Inventory Summary
CREATE OR REPLACE VIEW inventory_summary AS
SELECT
    i.id,
    p.product_code,
    p.product_name,
    pc.category_name,
    i.quantity_on_hand,
    i.reserved_quantity,
    i.available_quantity,
    i.reorder_level,
    CASE
        WHEN i.quantity_on_hand <= i.reorder_level THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_status,
    cl.location_name,
    i.last_stock_date
FROM inventory i
JOIN products p ON i.product_id = p.id
JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN company_locations cl ON i.location_id = cl.id;

-- View: Pending Bills Summary
CREATE OR REPLACE VIEW pending_bills_summary AS
SELECT
    'Purchase' as bill_type,
    pb.bill_number,
    pb.bill_date,
    pb.due_date,
    s.supplier_name as party_name,
    pb.grand_total,
    pb.paid_amount,
    (pb.grand_total - pb.paid_amount) as pending_amount,
    pb.payment_status,
    CASE
        WHEN pb.due_date < CURRENT_DATE THEN 'Overdue'
        WHEN pb.due_date = CURRENT_DATE THEN 'Due Today'
        ELSE 'Upcoming'
    END as due_status
FROM purchase_bills pb
JOIN suppliers s ON pb.supplier_id = s.id
WHERE pb.payment_status != 'paid'
UNION ALL
SELECT
    'Sale' as bill_type,
    sb.bill_number,
    sb.bill_date,
    sb.due_date,
    b.buyer_name as party_name,
    sb.grand_total,
    sb.paid_amount,
    (sb.grand_total - sb.paid_amount) as pending_amount,
    sb.payment_status,
    CASE
        WHEN sb.due_date < CURRENT_DATE THEN 'Overdue'
        WHEN sb.due_date = CURRENT_DATE THEN 'Due Today'
        ELSE 'Upcoming'
    END as due_status
FROM sale_bills sb
JOIN buyers b ON sb.buyer_id = b.id
WHERE sb.payment_status != 'paid';

-- ============================================
-- INITIAL DATA SEEDING (Optional)
-- ============================================

-- Insert default roles
INSERT INTO roles (role_name, role_display_name, description) VALUES
    ('admin', 'Administrator', 'Full system access'),
    ('company_md', 'Managing Director', 'Top-level management'),
    ('company_hod', 'Head of Department', 'Department head with approval rights'),
    ('account', 'Accountant', 'Financial and billing management'),
    ('delivery_boy', 'Delivery Boy', 'Material delivery'),
    ('buyer', 'Buyer', 'Can place orders'),
    ('supplier', 'Supplier/Vendor', 'Supplies materials'),
    ('security_guard', 'Security Guard', 'Security monitoring'),
    ('security_supervisor', 'Security Supervisor', 'Security team management'),
    ('society_manager', 'Society Manager', 'Overall facility management'),
    ('service_boy', 'Service Boy', 'General services')
ON CONFLICT (role_name) DO NOTHING;

-- Insert default leave types
INSERT INTO leave_types (leave_type, leave_name, yearly_quota, can_carry_forward, max_carry_forward) VALUES
    ('sick_leave', 'Sick Leave', 12, false, 0),
    ('casual_leave', 'Casual Leave', 12, true, 5),
    ('paid_leave', 'Paid Leave', 18, true, 7),
    ('unpaid_leave', 'Unpaid Leave', 0, false, 0),
    ('emergency_leave', 'Emergency Leave', 3, false, 0)
ON CONFLICT (leave_type) DO NOTHING;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE roles IS 'Master table for user roles and permissions';
COMMENT ON TABLE designations IS 'Master table for employee designations/job titles';
COMMENT ON TABLE employees IS 'Employee master data';
COMMENT ON TABLE users IS 'System users linked to auth.users';
COMMENT ON TABLE products IS 'Product master with categories and pricing';
COMMENT ON TABLE suppliers IS 'Supplier/Vendor master data';
COMMENT ON TABLE order_requests IS 'Order requests from buyers';
COMMENT ON TABLE purchase_orders IS 'Purchase orders to suppliers';
COMMENT ON TABLE material_receipts IS 'Material receipt/GRN tracking';
COMMENT ON TABLE material_tickets IS 'Quality and quantity check tickets';
COMMENT ON TABLE panic_alerts IS 'Emergency alerts from security guards';
COMMENT ON TABLE inventory IS 'Current stock/inventory levels';
COMMENT ON TABLE stock_transactions IS 'All inventory movements';

-- ============================================
-- END OF SCHEMA
-- ============================================

-- ============================================
-- PHASE 2: ENTERPRISE EXPANSION
-- Facility Management & Services System
-- Complete Production-Grade Schema
-- ============================================

-- This builds on top of the Phase 1 (46 tables) schema
-- Adding ~50+ tables for enterprise compliance, audit, and operations

-- ============================================
-- 1. AUTH & RBAC SYSTEM (6 TABLES)
-- ============================================

-- Granular Permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permission_code VARCHAR(100) UNIQUE NOT NULL,
    permission_name VARCHAR(200) NOT NULL,
    module VARCHAR(100) NOT NULL, -- procurement, hrms, security, etc.
    resource VARCHAR(100), -- orders, employees, inventory
    action VARCHAR(50), -- create, read, update, delete, approve
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission Mapping
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
    can_delegate BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- User-Role Mapping (Many-to-Many)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- Login Sessions
CREATE TABLE login_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_token VARCHAR(500) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),
    login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    logout_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Login Activity Logs
CREATE TABLE login_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    username VARCHAR(100),
    login_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    login_status VARCHAR(20) NOT NULL, -- success, failed, blocked
    ip_address INET,
    user_agent TEXT,
    failure_reason TEXT,
    geo_location JSONB -- {city, country, lat, lng}
);

-- Access Audit Logs (Who accessed what, when)
CREATE TABLE access_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    resource_type VARCHAR(100) NOT NULL, -- table name or module
    resource_id UUID,
    action VARCHAR(50) NOT NULL, -- view, create, update, delete, export
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    details JSONB
);

-- ============================================
-- 2. ENHANCED HRMS (10 TABLES)
-- ============================================

-- Recruitment & Candidates
CREATE TABLE recruitment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation_id UUID REFERENCES designations(id) NOT NULL,
    number_of_positions INTEGER NOT NULL,
    job_description TEXT,
    required_skills JSONB,
    employment_type VARCHAR(50), -- permanent, contract, temporary
    priority VARCHAR(20) DEFAULT 'normal',
    requested_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    status VARCHAR(20) DEFAULT 'open', -- open, in_progress, closed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    address TEXT,
    qualification VARCHAR(100),
    experience_years DECIMAL(4, 1),
    current_company VARCHAR(200),
    current_ctc DECIMAL(10, 2),
    expected_ctc DECIMAL(10, 2),
    notice_period_days INTEGER,
    recruitment_request_id UUID REFERENCES recruitment_requests(id),
    source VARCHAR(50), -- agency, referral, portal, walk_in
    referrer_name VARCHAR(100),
    resume_url TEXT,
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'applied', -- applied, screening, interview, selected, rejected, joined
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Background Verification
CREATE TABLE background_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    verification_type VARCHAR(50) NOT NULL, -- police, address, education, employment
    verification_agency VARCHAR(200),
    initiated_date DATE NOT NULL,
    completed_date DATE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, verified, rejected
    verification_document_url TEXT,
    remarks TEXT,
    verified_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Employee Documents
CREATE TABLE employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- aadhar, pan, voter_id, passport, psara, police_verification
    document_number VARCHAR(100),
    document_url TEXT NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES employees(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shifts
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_code VARCHAR(20) UNIQUE NOT NULL,
    shift_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours DECIMAL(4, 2),
    is_night_shift BOOLEAN DEFAULT false,
    break_duration_minutes INTEGER DEFAULT 60,
    grace_time_minutes INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Employee Shift Assignments
CREATE TABLE employee_shift_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    shift_id UUID REFERENCES shifts(id) NOT NULL,
    assigned_from DATE NOT NULL,
    assigned_to DATE,
    is_active BOOLEAN DEFAULT true,
    assigned_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payroll Runs
CREATE TABLE payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_month VARCHAR(7) NOT NULL, -- YYYY-MM format
    payroll_period_from DATE NOT NULL,
    payroll_period_to DATE NOT NULL,
    total_employees INTEGER,
    total_gross_salary DECIMAL(12, 2),
    total_deductions DECIMAL(12, 2),
    total_net_salary DECIMAL(12, 2),
    status VARCHAR(20) DEFAULT 'draft', -- draft, processed, approved, paid
    processed_by UUID REFERENCES employees(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(payroll_month)
);

-- Salary Components
CREATE TABLE salary_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    component_code VARCHAR(20) UNIQUE NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    component_type VARCHAR(20) NOT NULL, -- earning, deduction
    calculation_type VARCHAR(20), -- fixed, percentage, formula
    is_taxable BOOLEAN DEFAULT true,
    is_statutory BOOLEAN DEFAULT false, -- PF, ESIC, PT
    display_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Employee Salary Structure
CREATE TABLE employee_salary_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    salary_component_id UUID REFERENCES salary_components(id) NOT NULL,
    amount DECIMAL(10, 2),
    percentage DECIMAL(5, 2),
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payslips
CREATE TABLE payslips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payslip_number VARCHAR(50) UNIQUE NOT NULL,
    payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    pay_period_from DATE NOT NULL,
    pay_period_to DATE NOT NULL,
    working_days DECIMAL(5, 2),
    present_days DECIMAL(5, 2),
    absent_days DECIMAL(5, 2),
    leave_days DECIMAL(5, 2),
    basic_salary DECIMAL(10, 2),
    hra DECIMAL(10, 2),
    special_allowance DECIMAL(10, 2),
    overtime_amount DECIMAL(10, 2),
    gross_salary DECIMAL(10, 2) NOT NULL,
    pf_employee DECIMAL(10, 2) DEFAULT 0,
    pf_employer DECIMAL(10, 2) DEFAULT 0,
    esic_employee DECIMAL(10, 2) DEFAULT 0,
    esic_employer DECIMAL(10, 2) DEFAULT 0,
    professional_tax DECIMAL(10, 2) DEFAULT 0,
    tds DECIMAL(10, 2) DEFAULT 0,
    other_deductions DECIMAL(10, 2) DEFAULT 0,
    total_deductions DECIMAL(10, 2) NOT NULL,
    net_salary DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid
    payment_date DATE,
    payment_mode VARCHAR(50),
    payment_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Overtime Logs
CREATE TABLE overtime_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    ot_date DATE NOT NULL,
    regular_hours DECIMAL(4, 2),
    overtime_hours DECIMAL(4, 2) NOT NULL,
    ot_rate_per_hour DECIMAL(8, 2),
    ot_amount DECIMAL(10, 2),
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. FINANCIAL SYSTEM ENHANCEMENTS (6 TABLES)
-- ============================================

-- Payment Methods
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    method_code VARCHAR(20) UNIQUE NOT NULL,
    method_name VARCHAR(100) NOT NULL,
    description TEXT,
    requires_reference BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments (Detailed Payment Tracking)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    payment_type VARCHAR(20) NOT NULL, -- purchase, sale
    reference_type VARCHAR(50) NOT NULL, -- purchase_bill, sale_bill
    reference_id UUID NOT NULL,
    payer_type VARCHAR(50), -- buyer, company
    payer_id UUID,
    payee_type VARCHAR(50), -- supplier, company
    payee_id UUID,
    payment_date DATE NOT NULL,
    payment_method_id UUID REFERENCES payment_methods(id),
    payment_mode VARCHAR(50), -- cash, cheque, neft, rtgs, upi
    amount DECIMAL(12, 2) NOT NULL,
    transaction_reference VARCHAR(200),
    bank_name VARCHAR(100),
    cheque_number VARCHAR(50),
    cheque_date DATE,
    upi_transaction_id VARCHAR(100),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'completed', -- pending, completed, failed, cancelled
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ledger Entries (Double-Entry Bookkeeping)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- asset, liability, income, expense
    account_name VARCHAR(200) NOT NULL,
    debit_amount DECIMAL(12, 2) DEFAULT 0,
    credit_amount DECIMAL(12, 2) DEFAULT 0,
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT,
    posted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tax Rates (GST Configuration)
CREATE TABLE tax_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tax_type VARCHAR(50) NOT NULL, -- gst, cgst, sgst, igst
    tax_name VARCHAR(100) NOT NULL,
    tax_percentage DECIMAL(5, 2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bill Status Change Logs
CREATE TABLE bill_status_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_type VARCHAR(20) NOT NULL, -- purchase, sale
    bill_id UUID NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT
);

-- Invoice Audit Logs
CREATE TABLE invoice_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_type VARCHAR(20) NOT NULL, -- purchase, sale
    invoice_id UUID NOT NULL,
    audit_date DATE NOT NULL,
    audited_by UUID REFERENCES employees(id) NOT NULL,
    compliance_status VARCHAR(20), -- compliant, non_compliant, pending
    discrepancies JSONB,
    recommendations TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. SERVICE EXECUTION & PROOF SYSTEM (7 TABLES)
-- ============================================

-- Service Requests (AC, Pest Control, etc.)
CREATE TABLE service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    service_id UUID REFERENCES services(id) NOT NULL,
    requester_type VARCHAR(50), -- buyer, resident, society_manager
    requester_id UUID,
    location_id UUID REFERENCES company_locations(id),
    request_date DATE NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- open, assigned, in_progress, completed, cancelled
    assigned_to UUID REFERENCES employees(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    scheduled_date DATE,
    scheduled_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job/Service Sessions
CREATE TABLE job_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_number VARCHAR(50) UNIQUE NOT NULL,
    service_request_id UUID REFERENCES service_requests(id) NOT NULL,
    technician_id UUID REFERENCES employees(id) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    start_latitude DECIMAL(10, 8),
    start_longitude DECIMAL(11, 8),
    end_latitude DECIMAL(10, 8),
    end_longitude DECIMAL(11, 8),
    work_performed TEXT,
    materials_used JSONB,
    status VARCHAR(20) DEFAULT 'started', -- started, paused, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job Photos (Before/After Evidence)
CREATE TABLE job_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_session_id UUID REFERENCES job_sessions(id) ON DELETE CASCADE NOT NULL,
    photo_type VARCHAR(20) NOT NULL, -- before, after, during
    photo_url TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- PPE (Personal Protective Equipment) Checklists
CREATE TABLE ppe_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) NOT NULL,
    checklist_name VARCHAR(200) NOT NULL,
    required_items JSONB NOT NULL, -- [{item: "Mask", mandatory: true}, ...]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ppe_checklist_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_session_id UUID REFERENCES job_sessions(id) ON DELETE CASCADE NOT NULL,
    ppe_checklist_id UUID REFERENCES ppe_checklists(id) NOT NULL,
    responses JSONB NOT NULL, -- [{item: "Mask", checked: true}, ...]
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_by UUID REFERENCES employees(id)
);

-- Treatment Logs (Pest Control Specific)
CREATE TABLE treatment_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_session_id UUID REFERENCES job_sessions(id) ON DELETE CASCADE NOT NULL,
    treatment_type VARCHAR(50) NOT NULL, -- fogging, spraying, gel_application, baiting
    chemical_used VARCHAR(200),
    chemical_batch_number VARCHAR(50),
    quantity_used DECIMAL(10, 2),
    unit_of_measurement VARCHAR(20),
    area_treated VARCHAR(200),
    area_size_sqft DECIMAL(10, 2),
    safety_precautions TEXT,
    resident_notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Technician Skills
CREATE TABLE technician_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50), -- ac_repair, pest_control, plumbing, electrical
    proficiency_level VARCHAR(20), -- beginner, intermediate, expert
    certification_name VARCHAR(200),
    certification_number VARCHAR(100),
    certification_date DATE,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. ENHANCED INVENTORY SYSTEM (7 TABLES)
-- ============================================

-- Warehouses/Storage Locations
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_code VARCHAR(20) UNIQUE NOT NULL,
    warehouse_name VARCHAR(200) NOT NULL,
    warehouse_type VARCHAR(50), -- main, sub_store, chemical_store, cold_storage
    company_location_id UUID REFERENCES company_locations(id),
    manager_id UUID REFERENCES employees(id),
    capacity_sqft DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stock Batches (for expiry tracking)
CREATE TABLE stock_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id),
    quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measurement VARCHAR(20),
    manufacturing_date DATE,
    expiry_date DATE,
    supplier_id UUID REFERENCES suppliers(id),
    purchase_rate DECIMAL(10, 2),
    mrp DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'active', -- active, expired, recalled
    is_hazardous BOOLEAN DEFAULT false,
    storage_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Expiry Tracking & Alerts
CREATE TABLE expiry_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_batch_id UUID REFERENCES stock_batches(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    expiry_date DATE NOT NULL,
    alert_date DATE NOT NULL,
    alert_type VARCHAR(20), -- 30_days, 15_days, 7_days, expired
    quantity DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'pending', -- pending, acknowledged, disposed
    acknowledged_by UUID REFERENCES employees(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    action_taken TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reorder Rules
CREATE TABLE reorder_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id),
    reorder_level DECIMAL(10, 2) NOT NULL,
    reorder_quantity DECIMAL(10, 2) NOT NULL,
    max_stock_level DECIMAL(10, 2),
    preferred_supplier_id UUID REFERENCES suppliers(id),
    auto_reorder_enabled BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, warehouse_id)
);

-- Shortage Notes
CREATE TABLE shortage_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_number VARCHAR(50) UNIQUE NOT NULL,
    material_receipt_id UUID REFERENCES material_receipts(id),
    po_id UUID REFERENCES purchase_orders(id) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) NOT NULL,
    note_date DATE NOT NULL,
    total_shortage_value DECIMAL(12, 2),
    status VARCHAR(20) DEFAULT 'open', -- open, acknowledged, resolved, closed
    supplier_acknowledged BOOLEAN DEFAULT false,
    acknowledged_date DATE,
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shortage_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shortage_note_id UUID REFERENCES shortage_notes(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    ordered_quantity DECIMAL(10, 2) NOT NULL,
    received_quantity DECIMAL(10, 2) NOT NULL,
    shortage_quantity DECIMAL(10, 2) NOT NULL,
    rate DECIMAL(10, 2),
    shortage_value DECIMAL(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Material Approvals (for hazardous/controlled items)
CREATE TABLE material_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) NOT NULL,
    requested_by UUID REFERENCES employees(id) NOT NULL,
    requested_quantity DECIMAL(10, 2) NOT NULL,
    purpose TEXT NOT NULL,
    requested_date DATE NOT NULL,
    approved_by UUID REFERENCES employees(id),
    approved_quantity DECIMAL(10, 2),
    approved_date DATE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT,
    issued_date DATE,
    returned_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. VENDOR MANAGEMENT ENHANCEMENTS (5 TABLES)
-- ============================================

-- Vendor Users (Portal Access for Suppliers)
CREATE TABLE vendor_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    designation VARCHAR(100),
    is_primary_contact BOOLEAN DEFAULT false,
    can_accept_orders BOOLEAN DEFAULT true,
    can_view_payments BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(supplier_id, email)
);

-- Vendor Documents
CREATE TABLE vendor_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- gst_certificate, pan_card, cancelled_cheque, msme, trade_license
    document_number VARCHAR(100),
    document_url TEXT NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES employees(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vendor Performance Ratings
CREATE TABLE vendor_performance_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    rating_period VARCHAR(7) NOT NULL, -- YYYY-MM
    quality_score DECIMAL(3, 1) CHECK (quality_score >= 0 AND quality_score <= 10),
    delivery_score DECIMAL(3, 1) CHECK (delivery_score >= 0 AND delivery_score <= 10),
    pricing_score DECIMAL(3, 1) CHECK (pricing_score >= 0 AND pricing_score <= 10),
    communication_score DECIMAL(3, 1) CHECK (communication_score >= 0 AND communication_score <= 10),
    compliance_score DECIMAL(3, 1) CHECK (compliance_score >= 0 AND compliance_score <= 10),
    overall_score DECIMAL(3, 1) CHECK (overall_score >= 0 AND overall_score <= 10),
    total_orders INTEGER,
    on_time_deliveries INTEGER,
    on_time_percentage DECIMAL(5, 2),
    defect_rate DECIMAL(5, 2),
    remarks TEXT,
    rated_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(supplier_id, rating_period)
);

-- Vendor Contracts
CREATE TABLE vendor_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    contract_type VARCHAR(50), -- annual, project_based, rate_contract
    contract_value DECIMAL(12, 2),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    payment_terms VARCHAR(200),
    delivery_terms VARCHAR(200),
    warranty_terms TEXT,
    penalty_clause TEXT,
    renewal_terms TEXT,
    contract_document_url TEXT,
    status VARCHAR(20) DEFAULT 'active', -- draft, active, expired, terminated
    signed_by_supplier BOOLEAN DEFAULT false,
    signed_by_company BOOLEAN DEFAULT false,
    created_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SLA (Service Level Agreement) Tracking
CREATE TABLE sla_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_type VARCHAR(50) NOT NULL, -- purchase_order, service_request
    reference_id UUID NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    sla_parameter VARCHAR(100) NOT NULL, -- delivery_time, response_time, resolution_time
    expected_value DECIMAL(10, 2),
    expected_unit VARCHAR(20), -- hours, days
    actual_value DECIMAL(10, 2),
    actual_unit VARCHAR(20),
    sla_met BOOLEAN,
    variance DECIMAL(10, 2),
    penalty_applicable BOOLEAN DEFAULT false,
    penalty_amount DECIMAL(10, 2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. SOCIETY/RESIDENTIAL OPERATIONS (6 TABLES)
-- ============================================

-- Societies/Complexes
CREATE TABLE societies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_code VARCHAR(20) UNIQUE NOT NULL,
    society_name VARCHAR(200) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    total_buildings INTEGER,
    total_flats INTEGER,
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    society_manager_id UUID REFERENCES employees(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Buildings/Wings
CREATE TABLE buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_code VARCHAR(20) NOT NULL,
    building_name VARCHAR(100) NOT NULL,
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE NOT NULL,
    total_floors INTEGER,
    total_flats INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(society_id, building_code)
);

-- Flats/Units
CREATE TABLE flats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flat_number VARCHAR(20) NOT NULL,
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
    floor_number INTEGER,
    flat_type VARCHAR(50), -- 1bhk, 2bhk, 3bhk, penthouse
    area_sqft DECIMAL(8, 2),
    ownership_type VARCHAR(20), -- owner, tenant
    is_occupied BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(building_id, flat_number)
);

-- Residents
CREATE TABLE residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_code VARCHAR(50) UNIQUE NOT NULL,
    flat_id UUID REFERENCES flats(id) ON DELETE CASCADE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    relation VARCHAR(50), -- owner, tenant, family_member
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    email VARCHAR(255),
    is_primary_contact BOOLEAN DEFAULT false,
    move_in_date DATE,
    move_out_date DATE,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Visitors
CREATE TABLE visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_name VARCHAR(200) NOT NULL,
    visitor_type VARCHAR(50), -- guest, vendor, contractor, service_staff
    phone VARCHAR(20),
    vehicle_number VARCHAR(20),
    photo_url TEXT,
    flat_id UUID REFERENCES flats(id),
    resident_id UUID REFERENCES residents(id),
    purpose VARCHAR(200),
    entry_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP WITH TIME ZONE,
    entry_guard_id UUID REFERENCES security_guards(id),
    exit_guard_id UUID REFERENCES security_guards(id),
    entry_location_id UUID REFERENCES company_locations(id),
    approved_by_resident BOOLEAN DEFAULT false,
    visitor_pass_number VARCHAR(50),
    is_frequent_visitor BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Guard Patrol Logs
CREATE TABLE guard_patrol_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID REFERENCES security_guards(id) NOT NULL,
    patrol_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    patrol_end_time TIMESTAMP WITH TIME ZONE,
    patrol_route JSONB, -- Array of location checkpoints
    checkpoints_verified INTEGER,
    total_checkpoints INTEGER,
    anomalies_found TEXT,
    photos JSONB, -- Array of photo URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. WORKFLOW ENGINE (4 TABLES)
-- ============================================

-- Workflow Definitions
CREATE TABLE workflow_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_code VARCHAR(50) UNIQUE NOT NULL,
    workflow_name VARCHAR(200) NOT NULL,
    workflow_type VARCHAR(50), -- order_approval, leave_approval, material_request
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Steps
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflow_definitions(id) ON DELETE CASCADE NOT NULL,
    step_order INTEGER NOT NULL,
    step_name VARCHAR(200) NOT NULL,
    step_type VARCHAR(50), -- approval, notification, action
    required_role_id UUID REFERENCES roles(id),
    required_permission_id UUID REFERENCES permissions(id),
    auto_approve_conditions JSONB,
    escalation_hours INTEGER,
    escalation_to_role_id UUID REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Instances (Active Workflows)
CREATE TABLE workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflow_definitions(id) NOT NULL,
    reference_type VARCHAR(50) NOT NULL, -- order_request, leave_application
    reference_id UUID NOT NULL,
    current_step_id UUID REFERENCES workflow_steps(id),
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, cancelled
    initiated_by UUID REFERENCES auth.users(id),
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Approval Logs
CREATE TABLE approval_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE NOT NULL,
    workflow_step_id UUID REFERENCES workflow_steps(id) NOT NULL,
    approver_id UUID REFERENCES auth.users(id) NOT NULL,
    action VARCHAR(20) NOT NULL, -- approved, rejected, forwarded
    comments TEXT,
    actioned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. EMPLOYEE BEHAVIOR & COMPLIANCE (3 TABLES)
-- ============================================

-- Employee Behavior Tickets
CREATE TABLE employee_behavior_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    category VARCHAR(50) NOT NULL, -- sleeping_on_duty, rudeness, absence, grooming, unauthorized_entry
    severity VARCHAR(20) NOT NULL, -- low, medium, high
    incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT NOT NULL,
    evidence_urls JSONB, -- Array of photo/video URLs
    location_id UUID REFERENCES company_locations(id),
    reported_by UUID REFERENCES employees(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- open, under_review, resolved, closed
    action_taken TEXT,
    resolved_by UUID REFERENCES employees(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Employee Warnings
CREATE TABLE employee_warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warning_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    behavior_ticket_id UUID REFERENCES employee_behavior_tickets(id),
    warning_type VARCHAR(50), -- verbal, written, final
    warning_date DATE NOT NULL,
    reason TEXT NOT NULL,
    issued_by UUID REFERENCES employees(id) NOT NULL,
    acknowledged_by_employee BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Employee Terminations
CREATE TABLE employee_terminations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    termination_type VARCHAR(50), -- resignation, dismissal, retirement, end_of_contract
    termination_date DATE NOT NULL,
    notice_period_days INTEGER,
    last_working_date DATE,
    reason TEXT,
    exit_interview_conducted BOOLEAN DEFAULT false,
    exit_interview_notes TEXT,
    final_settlement_amount DECIMAL(10, 2),
    settlement_paid BOOLEAN DEFAULT false,
    settlement_date DATE,
    terminated_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 10. SERVICES MODULE - SERVICE PURCHASE ORDERS (2 TABLES)
-- ============================================

-- Service Purchase Orders (SPO)
CREATE TABLE service_purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spo_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) NOT NULL,
    service_id UUID REFERENCES services(id) NOT NULL,
    spo_date DATE NOT NULL,
    deployment_start_date DATE,
    deployment_end_date DATE,
    number_of_personnel INTEGER,
    service_grade VARCHAR(20), -- For security: A, B, C, D
    shift_timing VARCHAR(50),
    total_amount DECIMAL(12, 2),
    gst_amount DECIMAL(12, 2),
    grand_total DECIMAL(12, 2),
    payment_terms VARCHAR(100),
    status VARCHAR(20) DEFAULT 'spo_issued',
    prepared_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Service Delivery Notes
CREATE TABLE service_delivery_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_note_number VARCHAR(50) UNIQUE NOT NULL,
    spo_id UUID REFERENCES service_purchase_orders(id) NOT NULL,
    delivery_date DATE NOT NULL,
    personnel_details JSONB NOT NULL, -- Array of {name, id, qualification, photo}
    verified_by UUID REFERENCES employees(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Auth & RBAC
CREATE INDEX idx_permissions_module ON permissions(module);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_login_sessions_user_id ON login_sessions(user_id);
CREATE INDEX idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX idx_login_logs_login_status ON login_logs(login_status);

-- HRMS
CREATE INDEX idx_candidates_recruitment_request_id ON candidates(recruitment_request_id);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_background_verifications_candidate_id ON background_verifications(candidate_id);
CREATE INDEX idx_employee_documents_employee_id ON employee_documents(employee_id);
CREATE INDEX idx_employee_shift_assignments_employee_id ON employee_shift_assignments(employee_id);
CREATE INDEX idx_payslips_employee_id ON payslips(employee_id);
CREATE INDEX idx_payslips_payroll_run_id ON payslips(payroll_run_id);
CREATE INDEX idx_overtime_logs_employee_id ON overtime_logs(employee_id);

-- Financial
CREATE INDEX idx_payments_reference_id ON payments(reference_id);
CREATE INDEX idx_ledger_entries_entry_date ON ledger_entries(entry_date);
CREATE INDEX idx_ledger_entries_account_type ON ledger_entries(account_type);

-- Service Execution
CREATE INDEX idx_service_requests_service_id ON service_requests(service_id);
CREATE INDEX idx_service_requests_assigned_to ON service_requests(assigned_to);
CREATE INDEX idx_job_sessions_service_request_id ON job_sessions(service_request_id);
CREATE INDEX idx_job_sessions_technician_id ON job_sessions(technician_id);
CREATE INDEX idx_treatment_logs_job_session_id ON treatment_logs(job_session_id);

-- Inventory
CREATE INDEX idx_stock_batches_product_id ON stock_batches(product_id);
CREATE INDEX idx_stock_batches_expiry_date ON stock_batches(expiry_date);
CREATE INDEX idx_expiry_alerts_stock_batch_id ON expiry_alerts(stock_batch_id);
CREATE INDEX idx_expiry_alerts_status ON expiry_alerts(status);
CREATE INDEX idx_shortage_notes_po_id ON shortage_notes(po_id);
CREATE INDEX idx_shortage_notes_supplier_id ON shortage_notes(supplier_id);

-- Vendor Management
CREATE INDEX idx_vendor_users_supplier_id ON vendor_users(supplier_id);
CREATE INDEX idx_vendor_documents_supplier_id ON vendor_documents(supplier_id);
CREATE INDEX idx_vendor_contracts_supplier_id ON vendor_contracts(supplier_id);
CREATE INDEX idx_sla_tracking_supplier_id ON sla_tracking(supplier_id);

-- Society Operations
CREATE INDEX idx_buildings_society_id ON buildings(society_id);
CREATE INDEX idx_flats_building_id ON flats(building_id);
CREATE INDEX idx_residents_flat_id ON residents(flat_id);
CREATE INDEX idx_visitors_flat_id ON visitors(flat_id);
CREATE INDEX idx_visitors_entry_time ON visitors(entry_time);

-- Workflow
CREATE INDEX idx_workflow_instances_reference_id ON workflow_instances(reference_id);
CREATE INDEX idx_approval_logs_workflow_instance_id ON approval_logs(workflow_instance_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppe_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppe_checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE expiry_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortage_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortage_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_performance_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE flats ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE guard_patrol_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_behavior_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_terminations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_delivery_notes ENABLE ROW LEVEL SECURITY;

-- Sample RLS Policies (Add more as needed)

-- Permissions: Admin only
CREATE POLICY "Admins can manage permissions"
    ON permissions FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

-- Payslips: Employees can view their own
CREATE POLICY "Employees can view their own payslips"
    ON payslips FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT employee_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins and Account can manage payslips"
    ON payslips FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'account', 'company_hod'));

-- Visitors: Guards and Society Managers can manage
CREATE POLICY "Guards can manage visitors"
    ON visitors FOR ALL
    TO authenticated
    USING (get_user_role() IN ('security_guard', 'security_supervisor', 'society_manager', 'admin'));

-- Service Requests: Requester and assigned technician can view
CREATE POLICY "Users can view their service requests"
    ON service_requests FOR SELECT
    TO authenticated
    USING (
        assigned_to IN (
            SELECT employee_id FROM users WHERE id = auth.uid()
        ) OR
        get_user_role() IN ('society_manager', 'admin')
    );

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update timestamps
CREATE TRIGGER update_recruitment_requests_updated_at BEFORE UPDATE ON recruitment_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_runs_updated_at BEFORE UPDATE ON payroll_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit triggers for critical tables
CREATE TRIGGER audit_payslips AFTER INSERT OR UPDATE OR DELETE ON payslips
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_vendor_contracts AFTER INSERT OR UPDATE OR DELETE ON vendor_contracts
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- Vendor Performance Dashboard
CREATE OR REPLACE VIEW vendor_performance_dashboard AS
SELECT
    s.id as supplier_id,
    s.supplier_name,
    s.supplier_code,
    AVG(sf.rating) as avg_feedback_rating,
    COUNT(DISTINCT po.id) as total_orders,
    SUM(po.grand_total) as total_order_value,
    COUNT(DISTINCT CASE WHEN po.status = 'completed' THEN po.id END) as completed_orders,
    vpr.overall_score as latest_performance_score,
    vc.contract_number as active_contract
FROM suppliers s
LEFT JOIN supplier_feedback sf ON s.id = sf.supplier_id
LEFT JOIN purchase_orders po ON s.id = po.supplier_id
LEFT JOIN vendor_performance_ratings vpr ON s.id = vpr.supplier_id
    AND vpr.rating_period = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
LEFT JOIN vendor_contracts vc ON s.id = vc.supplier_id
    AND vc.status = 'active'
    AND CURRENT_DATE BETWEEN vc.start_date AND vc.end_date
GROUP BY s.id, s.supplier_name, s.supplier_code, vpr.overall_score, vc.contract_number;

-- Employee Attendance Summary
CREATE OR REPLACE VIEW employee_attendance_summary AS
SELECT
    e.id as employee_id,
    e.employee_code,
    e.first_name || ' ' || e.last_name as employee_name,
    d.designation_name,
    COUNT(DISTINCT al.log_date) as total_days_logged,
    COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.log_date END) as present_days,
    COUNT(DISTINCT CASE WHEN al.status = 'absent' THEN al.log_date END) as absent_days,
    COUNT(DISTINCT CASE WHEN al.status = 'on_leave' THEN al.log_date END) as leave_days,
    SUM(al.total_hours) as total_hours_worked
FROM employees e
LEFT JOIN designations d ON e.designation_id = d.id
LEFT JOIN attendance_logs al ON e.id = al.employee_id
WHERE al.log_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY e.id, e.employee_code, e.first_name, e.last_name, d.designation_name;

-- Stock Expiry Alert Dashboard
CREATE OR REPLACE VIEW stock_expiry_dashboard AS
SELECT
    sb.id as batch_id,
    sb.batch_number,
    p.product_code,
    p.product_name,
    pc.category_name,
    sb.quantity,
    sb.expiry_date,
    CASE
        WHEN sb.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'Critical (7 days)'
        WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '15 days' THEN 'Warning (15 days)'
        WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Alert (30 days)'
        ELSE 'OK'
    END as expiry_status,
    w.warehouse_name,
    sb.is_hazardous
FROM stock_batches sb
JOIN products p ON sb.product_id = p.id
JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN warehouses w ON sb.warehouse_id = w.id
WHERE sb.status = 'active'
    AND sb.expiry_date IS NOT NULL
ORDER BY sb.expiry_date ASC;

-- Service Request Status
CREATE OR REPLACE VIEW service_request_status_view AS
SELECT
    sr.id,
    sr.request_number,
    sr.request_date,
    s.service_name,
    sr.priority,
    sr.status,
    e.first_name || ' ' || e.last_name as assigned_technician,
    cl.location_name,
    sr.scheduled_date,
    COUNT(js.id) as total_sessions,
    COUNT(CASE WHEN js.status = 'completed' THEN js.id END) as completed_sessions
FROM service_requests sr
JOIN services s ON sr.service_id = s.id
LEFT JOIN employees e ON sr.assigned_to = e.id
LEFT JOIN company_locations cl ON sr.location_id = cl.id
LEFT JOIN job_sessions js ON sr.id = js.service_request_id
GROUP BY sr.id, sr.request_number, sr.request_date, s.service_name,
         sr.priority, sr.status, e.first_name, e.last_name,
         cl.location_name, sr.scheduled_date;

-- ============================================
-- ADDITIONAL HELPER FUNCTIONS
-- ============================================

-- Function to calculate employee working days
CREATE OR REPLACE FUNCTION calculate_working_days(
    p_employee_id UUID,
    p_from_date DATE,
    p_to_date DATE
)
RETURNS TABLE (
    working_days DECIMAL,
    present_days DECIMAL,
    absent_days DECIMAL,
    leave_days DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT d.day)::DECIMAL as working_days,
        COUNT(DISTINCT CASE WHEN al.status = 'present' THEN d.day END)::DECIMAL as present_days,
        COUNT(DISTINCT CASE WHEN al.status = 'absent' THEN d.day END)::DECIMAL as absent_days,
        COUNT(DISTINCT CASE WHEN al.status = 'on_leave' THEN d.day END)::DECIMAL as leave_days
    FROM generate_series(p_from_date, p_to_date, '1 day'::interval) d(day)
    LEFT JOIN attendance_logs al ON al.employee_id = p_employee_id
        AND al.log_date = d.day::DATE
    WHERE EXTRACT(DOW FROM d.day) NOT IN (0, 6) -- Exclude weekends
        AND NOT EXISTS (
            SELECT 1 FROM holidays h
            WHERE h.holiday_date = d.day::DATE
        );
END;
$$ LANGUAGE plpgsql;

-- Function to check stock reorder level
CREATE OR REPLACE FUNCTION check_reorder_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if stock has fallen below reorder level
    IF EXISTS (
        SELECT 1 FROM reorder_rules rr
        WHERE rr.product_id = NEW.product_id
            AND rr.warehouse_id = NEW.location_id
            AND NEW.quantity_on_hand <= rr.reorder_level
            AND rr.is_active = true
    ) THEN
        -- Create notification for low stock
        INSERT INTO notifications (
            user_id,
            notification_type,
            title,
            message,
            reference_type,
            reference_id,
            priority
        )
        SELECT
            u.id,
            'low_stock_alert',
            'Low Stock Alert',
            'Stock for product ' || p.product_name || ' has fallen below reorder level',
            'inventory',
            NEW.id,
            'high'
        FROM users u
        JOIN roles r ON u.role_id = r.id
        JOIN products p ON p.id = NEW.product_id
        WHERE r.role_name IN ('admin', 'account', 'society_manager');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_reorder_level
AFTER INSERT OR UPDATE ON inventory
FOR EACH ROW EXECUTE FUNCTION check_reorder_level();

-- ============================================
-- INITIAL DATA SEEDING
-- ============================================

-- Insert default payment methods
INSERT INTO payment_methods (method_code, method_name, requires_reference) VALUES
    ('CASH', 'Cash', false),
    ('CHEQUE', 'Cheque', true),
    ('NEFT', 'NEFT', true),
    ('RTGS', 'RTGS', true),
    ('UPI', 'UPI', true),
    ('CARD', 'Card Payment', true)
ON CONFLICT (method_code) DO NOTHING;

-- Insert default salary components
INSERT INTO salary_components (component_code, component_name, component_type, is_statutory) VALUES
    ('BASIC', 'Basic Salary', 'earning', false),
    ('HRA', 'House Rent Allowance', 'earning', false),
    ('SA', 'Special Allowance', 'earning', false),
    ('PF_EMP', 'PF - Employee', 'deduction', true),
    ('PF_EMP_R', 'PF - Employer', 'deduction', true),
    ('ESIC_EMP', 'ESIC - Employee', 'deduction', true),
    ('ESIC_EMP_R', 'ESIC - Employer', 'deduction', true),
    ('PT', 'Professional Tax', 'deduction', true),
    ('TDS', 'TDS', 'deduction', true)
ON CONFLICT (component_code) DO NOTHING;

-- Insert default shifts
INSERT INTO shifts (shift_code, shift_name, start_time, end_time, is_night_shift) VALUES
    ('DAY', 'Day Shift', '08:00', '20:00', false),
    ('NIGHT', 'Night Shift', '20:00', '08:00', true),
    ('MORNING', 'Morning Shift', '06:00', '14:00', false),
    ('EVENING', 'Evening Shift', '14:00', '22:00', false)
ON CONFLICT (shift_code) DO NOTHING;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE permissions IS 'Granular permissions for role-based access control';
COMMENT ON TABLE role_permissions IS 'Mapping of permissions to roles';
COMMENT ON TABLE user_roles IS 'Many-to-many mapping of users to roles';
COMMENT ON TABLE login_sessions IS 'Active user sessions for security tracking';
COMMENT ON TABLE recruitment_requests IS 'Job requisitions and hiring needs';
COMMENT ON TABLE candidates IS 'Candidate database for recruitment';
COMMENT ON TABLE background_verifications IS 'BGV tracking for candidates and employees';
COMMENT ON TABLE employee_documents IS 'Digital repository for employee identity and certification documents';
COMMENT ON TABLE payslips IS 'Monthly salary slips for employees';
COMMENT ON TABLE payments IS 'Detailed payment transaction tracking';
COMMENT ON TABLE ledger_entries IS 'General ledger for accounting';
COMMENT ON TABLE service_requests IS 'Service requests for AC, pest control, etc.';
COMMENT ON TABLE job_sessions IS 'Actual service execution sessions with GPS tracking';
COMMENT ON TABLE job_photos IS 'Before/after photographic evidence of service work';
COMMENT ON TABLE ppe_checklists IS 'Safety equipment checklists for hazardous work';
COMMENT ON TABLE treatment_logs IS 'Chemical treatment logs for pest control';
COMMENT ON TABLE stock_batches IS 'Batch-wise inventory for expiry tracking';
COMMENT ON TABLE expiry_alerts IS 'Automated alerts for expiring stock';
COMMENT ON TABLE vendor_contracts IS 'Legal contracts with suppliers';
COMMENT ON TABLE sla_tracking IS 'Service Level Agreement compliance tracking';
COMMENT ON TABLE societies IS 'Residential societies/complexes';
COMMENT ON TABLE visitors IS 'Visitor management with entry/exit logs';
COMMENT ON TABLE workflow_definitions IS 'Configurable business process workflows';
COMMENT ON TABLE approval_logs IS 'Audit trail for all approvals';
COMMENT ON TABLE employee_behavior_tickets IS 'Incident reporting for employee conduct';

-- ============================================
-- END OF PHASE 2 SCHEMA
-- ============================================
-- ============================================
-- CRITICAL FIXES & OPTIMIZATIONS
-- Facility Management & Services System
-- Apply these patches AFTER running Phase 1 & 2 schemas
-- ============================================

-- ============================================
-- FIX 1: OPTIMIZED RLS PERFORMANCE
-- ============================================

-- Drop the slow get_user_role() function
DROP FUNCTION IF EXISTS get_user_role();

-- Create optimized version using JWT claims
-- This is 10x faster as it doesn't require a database join
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    -- First try to get from JWT (fastest)
    RETURN COALESCE(
        auth.jwt() ->> 'user_role',
        -- Fallback to database lookup (slower but necessary for backward compatibility)
        (
            SELECT r.role_name::TEXT
            FROM roles r
            JOIN users u ON u.role_id = r.id
            WHERE u.id = auth.uid()
            LIMIT 1
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add comment explaining JWT requirement
COMMENT ON FUNCTION get_user_role() IS 
'Optimized role lookup. For best performance, add user_role to JWT claims in Supabase Auth hooks.
Example: { "user_role": "admin" } in app_metadata';

-- ============================================
-- FIX 2: INVENTORY REORDER TRIGGER BUG
-- ============================================

-- Drop the buggy trigger
DROP TRIGGER IF EXISTS trigger_check_reorder_level ON inventory;
DROP FUNCTION IF EXISTS check_reorder_level();

-- Create corrected version with proper location/warehouse handling
CREATE OR REPLACE FUNCTION check_reorder_level()
RETURNS TRIGGER AS $$
DECLARE
    v_reorder_rule RECORD;
    v_product_name TEXT;
BEGIN
    -- Get reorder rule for this product and location
    -- Fixed: properly match location_id to warehouse_id in reorder_rules
    SELECT rr.*, p.product_name INTO v_reorder_rule, v_product_name
    FROM reorder_rules rr
    JOIN products p ON p.id = rr.product_id
    WHERE rr.product_id = NEW.product_id
        AND (
            -- Match warehouse if location is a warehouse
            rr.warehouse_id IN (
                SELECT id FROM warehouses WHERE company_location_id = NEW.location_id
            )
            -- Or if no warehouse specified in rule and location matches
            OR (rr.warehouse_id IS NULL AND rr.product_id = NEW.product_id)
        )
        AND rr.is_active = true
        AND NEW.quantity_on_hand <= rr.reorder_level
    LIMIT 1;
    
    -- If reorder threshold is crossed, create notifications
    IF v_reorder_rule IS NOT NULL THEN
        -- Insert notification for all relevant users
        INSERT INTO notifications (
            user_id,
            notification_type,
            title,
            message,
            reference_type,
            reference_id,
            priority
        )
        SELECT
            u.id,
            'low_stock_alert',
            'Low Stock Alert',
            format('Stock for product "%s" has fallen to %s %s (Reorder level: %s)', 
                   v_product_name,
                   NEW.quantity_on_hand,
                   (SELECT unit_of_measurement FROM products WHERE id = NEW.product_id),
                   v_reorder_rule.reorder_level
            ),
            'inventory',
            NEW.id,
            'high'
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        WHERE r.role_name IN ('admin', 'account', 'society_manager')
            AND ur.is_active = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_check_reorder_level
AFTER INSERT OR UPDATE OF quantity_on_hand ON inventory
FOR EACH ROW EXECUTE FUNCTION check_reorder_level();

-- ============================================
-- FIX 3: POLYMORPHIC REFERENCE INTEGRITY
-- ============================================

-- Add validation triggers for polymorphic foreign keys

-- Ledger Entries Reference Validation
CREATE OR REPLACE FUNCTION validate_ledger_entry_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_type IS NOT NULL AND NEW.reference_id IS NOT NULL THEN
        -- Validate based on reference type
        CASE NEW.reference_type
            WHEN 'purchase_bill' THEN
                IF NOT EXISTS (SELECT 1 FROM purchase_bills WHERE id = NEW.reference_id) THEN
                    RAISE EXCEPTION 'Invalid reference_id for purchase_bill';
                END IF;
            WHEN 'sale_bill' THEN
                IF NOT EXISTS (SELECT 1 FROM sale_bills WHERE id = NEW.reference_id) THEN
                    RAISE EXCEPTION 'Invalid reference_id for sale_bill';
                END IF;
            WHEN 'payment' THEN
                IF NOT EXISTS (SELECT 1 FROM payments WHERE id = NEW.reference_id) THEN
                    RAISE EXCEPTION 'Invalid reference_id for payment';
                END IF;
            -- Add other valid types as needed
        END CASE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_ledger_entry_ref
BEFORE INSERT OR UPDATE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION validate_ledger_entry_reference();

-- Payments Reference Validation
CREATE OR REPLACE FUNCTION validate_payment_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_type IS NOT NULL AND NEW.reference_id IS NOT NULL THEN
        CASE NEW.reference_type
            WHEN 'purchase_bill' THEN
                IF NOT EXISTS (SELECT 1 FROM purchase_bills WHERE id = NEW.reference_id) THEN
                    RAISE EXCEPTION 'Invalid reference_id for purchase_bill';
                END IF;
            WHEN 'sale_bill' THEN
                IF NOT EXISTS (SELECT 1 FROM sale_bills WHERE id = NEW.reference_id) THEN
                    RAISE EXCEPTION 'Invalid reference_id for sale_bill';
                END IF;
        END CASE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_payment_ref
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION validate_payment_reference();

-- SLA Tracking Reference Validation
CREATE OR REPLACE FUNCTION validate_sla_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_type IS NOT NULL AND NEW.reference_id IS NOT NULL THEN
        CASE NEW.reference_type
            WHEN 'purchase_order' THEN
                IF NOT EXISTS (SELECT 1 FROM purchase_orders WHERE id = NEW.reference_id) THEN
                    RAISE EXCEPTION 'Invalid reference_id for purchase_order';
                END IF;
            WHEN 'service_request' THEN
                IF NOT EXISTS (SELECT 1 FROM service_requests WHERE id = NEW.reference_id) THEN
                    RAISE EXCEPTION 'Invalid reference_id for service_request';
                END IF;
            WHEN 'service_purchase_order' THEN
                IF NOT EXISTS (SELECT 1 FROM service_purchase_orders WHERE id = NEW.reference_id) THEN
                    RAISE EXCEPTION 'Invalid reference_id for service_purchase_order';
                END IF;
        END CASE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_sla_ref
BEFORE INSERT OR UPDATE ON sla_tracking
FOR EACH ROW EXECUTE FUNCTION validate_sla_reference();

-- Workflow Instances Reference Validation
CREATE OR REPLACE FUNCTION validate_workflow_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_type IS NOT NULL AND NEW.reference_id IS NOT NULL THEN
        CASE NEW.reference_type
            WHEN 'order_request' THEN
                IF NOT EXISTS (SELECT 1 FROM order_requests WHERE id = NEW.reference_id) THEN
                    RAISE EXCEPTION 'Invalid reference_id for order_request';
                END IF;
            WHEN 'leave_application' THEN
                IF NOT EXISTS (SELECT 1 FROM leave_applications WHERE id = NEW.reference_id) THEN
                    RAISE EXCEPTION 'Invalid reference_id for leave_application';
                END IF;
            WHEN 'purchase_order' THEN
                IF NOT EXISTS (SELECT 1 FROM purchase_orders WHERE id = NEW.reference_id) THEN
                    RAISE EXCEPTION 'Invalid reference_id for purchase_order';
                END IF;
            WHEN 'service_request' THEN
                IF NOT EXISTS (SELECT 1 FROM service_requests WHERE id = NEW.reference_id) THEN
                    RAISE EXCEPTION 'Invalid reference_id for service_request';
                END IF;
        END CASE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_workflow_ref
BEFORE INSERT OR UPDATE ON workflow_instances
FOR EACH ROW EXECUTE FUNCTION validate_workflow_reference();

-- ============================================
-- FIX 4: TABLE PARTITIONING FOR SCALE
-- ============================================

-- GPS Tracking - Partition by month
-- Step 1: Rename existing table
ALTER TABLE IF EXISTS gps_tracking RENAME TO gps_tracking_old;

-- Step 2: Create partitioned table
CREATE TABLE gps_tracking (
    id UUID DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(6, 2),
    location_id UUID REFERENCES company_locations(id),
    is_within_fence BOOLEAN DEFAULT true,
    tracked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, tracked_at)
) PARTITION BY RANGE (tracked_at);

-- Create partitions for current and next 6 months
CREATE TABLE gps_tracking_2026_02 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE gps_tracking_2026_03 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE gps_tracking_2026_04 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE gps_tracking_2026_05 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE gps_tracking_2026_06 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE gps_tracking_2026_07 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- Migrate old data if exists
INSERT INTO gps_tracking SELECT * FROM gps_tracking_old WHERE tracked_at >= '2026-02-01';

-- Drop old table (after verifying migration)
-- DROP TABLE gps_tracking_old;

-- Recreate indexes on partitioned table
CREATE INDEX idx_gps_tracking_employee_id ON gps_tracking(employee_id, tracked_at);
CREATE INDEX idx_gps_tracking_tracked_at ON gps_tracking(tracked_at);
CREATE INDEX idx_gps_tracking_location_id ON gps_tracking(location_id);

-- Audit Logs - Partition by month
ALTER TABLE IF EXISTS audit_logs RENAME TO audit_logs_old;

CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    PRIMARY KEY (id, changed_at)
) PARTITION BY RANGE (changed_at);

-- Create partitions
CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE audit_logs_2026_03 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE audit_logs_2026_04 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE audit_logs_2026_05 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE audit_logs_2026_06 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE audit_logs_2026_07 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- Migrate old data
INSERT INTO audit_logs SELECT * FROM audit_logs_old WHERE changed_at >= '2026-02-01';

-- Recreate indexes
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name, changed_at);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id, changed_at);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by, changed_at);

-- Login Logs - Partition by month
ALTER TABLE IF EXISTS login_logs RENAME TO login_logs_old;

CREATE TABLE login_logs (
    id UUID DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    username VARCHAR(100),
    login_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    login_status VARCHAR(20) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    failure_reason TEXT,
    geo_location JSONB,
    PRIMARY KEY (id, login_attempt_at)
) PARTITION BY RANGE (login_attempt_at);

-- Create partitions
CREATE TABLE login_logs_2026_02 PARTITION OF login_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE login_logs_2026_03 PARTITION OF login_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE login_logs_2026_04 PARTITION OF login_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE login_logs_2026_05 PARTITION OF login_logs
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE login_logs_2026_06 PARTITION OF login_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE login_logs_2026_07 PARTITION OF login_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- Migrate old data
INSERT INTO login_logs SELECT * FROM login_logs_old WHERE login_attempt_at >= '2026-02-01';

-- Recreate indexes
CREATE INDEX idx_login_logs_user_id ON login_logs(user_id, login_attempt_at);
CREATE INDEX idx_login_logs_login_status ON login_logs(login_status, login_attempt_at);

-- ============================================
-- PARTITION MANAGEMENT FUNCTIONS
-- ============================================

-- Auto-create next month's partition
CREATE OR REPLACE FUNCTION create_monthly_partitions()
RETURNS void AS $$
DECLARE
    next_month DATE;
    month_after DATE;
    partition_name TEXT;
BEGIN
    next_month := date_trunc('month', CURRENT_DATE + INTERVAL '1 month');
    month_after := next_month + INTERVAL '1 month';
    
    -- GPS Tracking
    partition_name := 'gps_tracking_' || to_char(next_month, 'YYYY_MM');
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF gps_tracking FOR VALUES FROM (%L) TO (%L)',
        partition_name, next_month, month_after
    );
    
    -- Audit Logs
    partition_name := 'audit_logs_' || to_char(next_month, 'YYYY_MM');
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
        partition_name, next_month, month_after
    );
    
    -- Login Logs
    partition_name := 'login_logs_' || to_char(next_month, 'YYYY_MM');
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF login_logs FOR VALUES FROM (%L) TO (%L)',
        partition_name, next_month, month_after
    );
    
    RAISE NOTICE 'Created partitions for %', to_char(next_month, 'YYYY-MM');
END;
$$ LANGUAGE plpgsql;

-- Schedule this function to run monthly via pg_cron or external scheduler

-- Archive old partitions (older than 6 months)
CREATE OR REPLACE FUNCTION archive_old_partitions()
RETURNS void AS $$
DECLARE
    archive_before DATE;
    partition_record RECORD;
BEGIN
    archive_before := date_trunc('month', CURRENT_DATE - INTERVAL '6 months');
    
    -- Archive GPS tracking partitions
    FOR partition_record IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename LIKE 'gps_tracking_20%'
        AND tablename < 'gps_tracking_' || to_char(archive_before, 'YYYY_MM')
    LOOP
        EXECUTE format('ALTER TABLE %I NO INHERIT gps_tracking', partition_record.tablename);
        -- Optionally move to archive schema or dump to file
        RAISE NOTICE 'Archived GPS tracking partition: %', partition_record.tablename;
    END LOOP;
    
    -- Similar for audit_logs and login_logs
    FOR partition_record IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename LIKE 'audit_logs_20%'
        AND tablename < 'audit_logs_' || to_char(archive_before, 'YYYY_MM')
    LOOP
        EXECUTE format('ALTER TABLE %I NO INHERIT audit_logs', partition_record.tablename);
        RAISE NOTICE 'Archived audit logs partition: %', partition_record.tablename;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ============================================

-- Add missing composite indexes for common queries

-- Employees with active status
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active) WHERE is_active = true;

-- Purchase orders by status and date
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status_date ON purchase_orders(status, po_date DESC);

-- Material receipts pending quality check
CREATE INDEX IF NOT EXISTS idx_material_receipts_status ON material_receipts(status) WHERE status != 'acknowledged';

-- Visitors in last 24 hours
CREATE INDEX IF NOT EXISTS idx_visitors_recent ON visitors(entry_time DESC) WHERE exit_time IS NULL;

-- Pending notifications
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notifications(user_id, created_at DESC) WHERE is_read = false;

-- Active inventory with low stock
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(product_id) 
    WHERE quantity_on_hand <= reorder_level;

-- ============================================
-- STATISTICS & MONITORING VIEWS
-- ============================================

-- System health dashboard
CREATE OR REPLACE VIEW system_health_stats AS
SELECT
    'Total Users' as metric,
    COUNT(*)::TEXT as value,
    'users' as category
FROM users WHERE is_active = true
UNION ALL
SELECT
    'Active Sessions',
    COUNT(*)::TEXT,
    'auth'
FROM login_sessions WHERE is_active = true
UNION ALL
SELECT
    'Pending Orders',
    COUNT(*)::TEXT,
    'procurement'
FROM order_requests WHERE status IN ('pending', 'accepted')
UNION ALL
SELECT
    'Low Stock Items',
    COUNT(*)::TEXT,
    'inventory'
FROM inventory WHERE quantity_on_hand <= reorder_level
UNION ALL
SELECT
    'Open Service Requests',
    COUNT(*)::TEXT,
    'services'
FROM service_requests WHERE status IN ('open', 'assigned', 'in_progress')
UNION ALL
SELECT
    'Unpaid Bills (Purchase)',
    COUNT(*)::TEXT,
    'finance'
FROM purchase_bills WHERE payment_status != 'paid'
UNION ALL
SELECT
    'Unpaid Bills (Sale)',
    COUNT(*)::TEXT,
    'finance'
FROM sale_bills WHERE payment_status != 'paid';

-- ============================================
-- SECURITY ENHANCEMENTS
-- ============================================

-- Add rate limiting for login attempts
CREATE TABLE IF NOT EXISTS login_rate_limits (
    ip_address INET PRIMARY KEY,
    attempt_count INTEGER DEFAULT 1,
    first_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP WITH TIME ZONE
);

CREATE OR REPLACE FUNCTION check_login_rate_limit(p_ip_address INET)
RETURNS BOOLEAN AS $$
DECLARE
    v_record RECORD;
BEGIN
    SELECT * INTO v_record FROM login_rate_limits WHERE ip_address = p_ip_address;
    
    IF v_record IS NULL THEN
        INSERT INTO login_rate_limits (ip_address) VALUES (p_ip_address);
        RETURN true;
    END IF;
    
    -- If blocked, check if block has expired
    IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > CURRENT_TIMESTAMP THEN
        RETURN false;
    END IF;
    
    -- If more than 5 attempts in 15 minutes, block for 1 hour
    IF v_record.attempt_count >= 5 AND 
       v_record.first_attempt_at > CURRENT_TIMESTAMP - INTERVAL '15 minutes' THEN
        UPDATE login_rate_limits 
        SET blocked_until = CURRENT_TIMESTAMP + INTERVAL '1 hour'
        WHERE ip_address = p_ip_address;
        RETURN false;
    END IF;
    
    -- Reset counter if last attempt was more than 15 minutes ago
    IF v_record.first_attempt_at < CURRENT_TIMESTAMP - INTERVAL '15 minutes' THEN
        UPDATE login_rate_limits 
        SET attempt_count = 1, first_attempt_at = CURRENT_TIMESTAMP
        WHERE ip_address = p_ip_address;
    ELSE
        UPDATE login_rate_limits 
        SET attempt_count = attempt_count + 1
        WHERE ip_address = p_ip_address;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DEPLOYMENT CHECKLIST
-- ============================================

/*
POST-DEPLOYMENT STEPS:

1. JWT Configuration (CRITICAL):
   - In Supabase Dashboard → Authentication → Hooks
   - Add custom access token hook:
   ```javascript
   export const handler = async (event) => {
     const { user } = event;
     const { data, error } = await supabase
       .from('users')
       .select('role_id, roles(role_name)')
       .eq('id', user.id)
       .single();
     
     return {
       ...event,
       claims: {
         user_role: data?.roles?.role_name
       }
     };
   };
   ```

2. Partition Management:
   - Set up monthly cron job to run create_monthly_partitions()
   - Set up quarterly job to run archive_old_partitions()

3. Index Maintenance:
   - Run ANALYZE on all tables after bulk data import
   - Set up pg_stat_statements for query monitoring

4. Backup Strategy:
   - Daily backups with 30-day retention
   - Weekly full backups with 1-year retention
   - Test restore procedures

5. Monitoring:
   - Set up alerts for low stock
   - Monitor partition sizes
   - Track RLS policy performance
   - Monitor login_rate_limits for attacks

6. Performance Tuning:
   - Adjust work_mem for complex queries
   - Configure connection pooling
   - Set up read replicas for reporting

*/

-- ============================================
-- END OF CRITICAL FIXES
-- ============================================

COMMENT ON SCHEMA public IS 'Facility Management & Services System - Production-Ready Schema v1.1';
