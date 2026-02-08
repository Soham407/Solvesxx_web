-- ============================================
-- Facility Management & Services System
-- Supabase Database Schema - Phase A
-- ============================================

-- ============================================
-- 1. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 2. ENUMS
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
-- 3. MASTER TABLES (roles, designations, societies)
-- ============================================

-- Role Master
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

-- Designation Master
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

-- Leave Type Master
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
    society_manager_id UUID, -- FK to employees added later via ALTER TABLE
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. LOCATIONS (company_locations, buildings, flats)
-- ============================================

-- Company Location Master
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

-- Buildings
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

-- ============================================
-- 5. PEOPLE (users, residents, employees, security_guards)
-- ============================================

-- Employee Master
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

-- User Master
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

-- ============================================
-- 6. OPERATIONS (shifts, assignments, attendance)
-- ============================================

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

-- Daily Checklist Master
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

-- ============================================
-- 7. VISITOR LOGIC (visitors)
-- ============================================

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
-- 8. EMERGENCY (panic_alerts, notifications)
-- ============================================

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
-- 9. GPS (gps_tracking)
-- ============================================

-- GPS Tracking for Guards
-- 1. Create the Master Partitioned Table
CREATE TABLE gps_tracking (
    id UUID DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES security_guards(id),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    tracked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    battery_level INTEGER,
    is_mock_location BOOLEAN DEFAULT FALSE,
    accuracy_meters DECIMAL,
    speed_kmh DECIMAL,
    heading_degrees DECIMAL,
    
    -- Constraint: Partitioning requires the partition key to be part of the Primary Key
    PRIMARY KEY (id, tracked_at)
) PARTITION BY RANGE (tracked_at);

-- 2. Create the "Default" Partition 
CREATE TABLE gps_tracking_default PARTITION OF gps_tracking DEFAULT;

-- 3. Create Partitions for the next few months
CREATE TABLE gps_tracking_2026_02 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE gps_tracking_2026_03 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE gps_tracking_2026_04 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- 4. Create Performance Indexes
CREATE INDEX idx_gps_employee_time ON gps_tracking (employee_id, tracked_at DESC);
CREATE INDEX idx_gps_time_brin ON gps_tracking USING BRIN (tracked_at);

-- ============================================
-- 10. LATE CONSTRAINTS (Circular dependencies)
-- ============================================

-- Add society_manager_id reference to societies (needs employees table)
ALTER TABLE societies 
ADD CONSTRAINT fk_societies_manager 
FOREIGN KEY (society_manager_id) REFERENCES employees(id);