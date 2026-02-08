-- ============================================
-- SEED DATA FOR PHASE A (SINGLE ORG SETUP) - STRICT ID VERSION
-- ============================================
-- Run this in Supabase SQL Editor to FIX formatting errors
-- It creates data with EXACT IDs required by the Test Dashboard

-- 1. Populate Roles
INSERT INTO roles (role_name, role_display_name, description) VALUES
('admin', 'Administrator', 'Full system access'),
('security_guard', 'Security Guard', 'Gate access and patrol'),
('security_supervisor', 'Security Supervisor', 'Manage shifts and guards'),
('society_manager', 'Society Manager', 'Manage residents and complaints'),
('resident', 'Resident', 'App access for visitors')
ON CONFLICT (role_name) DO NOTHING;

-- 2. Organization (SRE01)
INSERT INTO societies (id, society_code, society_name, address, city, contact_person) 
VALUES 
('11111111-1111-1111-1111-111111111111', 'SRE01', 'Shri Radhamadhav Enterprise', '12/79/7 Shantinath Complex', 'Ichalkaranji', 'Admin')
ON CONFLICT (id) DO UPDATE SET society_name = EXCLUDED.society_name;

-- 3. Gate (GATE-01)
INSERT INTO company_locations (location_code, location_name, location_type, latitude, longitude, geo_fence_radius)
VALUES 
('GATE-01', 'Main Entrance Gate', 'gate', 18.5194, 73.8519, 300.0)
ON CONFLICT (location_code) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, geo_fence_radius = EXCLUDED.geo_fence_radius;

-- 4. CLEANUP (To ensure exact IDs)
-- We delete specific test data to re-insert it with FORCED IDs
DELETE FROM visitors WHERE resident_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM residents WHERE resident_code = 'RES-001'; -- Delete existing random ID resident
DELETE FROM security_guards WHERE guard_code = 'GRD-001';
DELETE FROM employees WHERE employee_code = 'EMP-GUARD-001';

-- 5. Ensure Building & Flat
DO $$ 
DECLARE 
  v_society_id UUID := '11111111-1111-1111-1111-111111111111';
  v_building_id UUID;
BEGIN
    INSERT INTO buildings (building_code, building_name, society_id, total_floors)
    VALUES ('BLD-A', 'Wing A', v_society_id, 5)
    ON CONFLICT (society_id, building_code) DO UPDATE SET total_floors = EXCLUDED.total_floors
    RETURNING id INTO v_building_id;

    IF v_building_id IS NULL THEN
        SELECT id INTO v_building_id FROM buildings WHERE society_id = v_society_id AND building_code = 'BLD-A';
    END IF;

    INSERT INTO flats (flat_number, building_id, floor_number, flat_type)
    VALUES 
    ('101', v_building_id, 1, '2bhk'),
    ('102', v_building_id, 1, '2bhk'),
    ('201', v_building_id, 2, '3bhk')
    ON CONFLICT (building_id, flat_number) DO NOTHING;
END $$;

-- 6. Insert Guard with FIXED ID: 1111...
DO $$
DECLARE
    v_designation_id UUID;
    v_gate_id UUID;
BEGIN
    -- Designation
    INSERT INTO designations (designation_code, designation_name, department)
    VALUES ('DESG-GUARD', 'Security Guard', 'Security')
    ON CONFLICT (designation_code) DO UPDATE SET designation_name = EXCLUDED.designation_name
    RETURNING id INTO v_designation_id;
    
    IF v_designation_id IS NULL THEN
        SELECT id INTO v_designation_id FROM designations WHERE designation_code = 'DESG-GUARD';
    END IF;

    -- Gate Link
    SELECT id INTO v_gate_id FROM company_locations WHERE location_code = 'GATE-01';

    -- Employee with FIXED ID
    INSERT INTO employees (id, employee_code, first_name, last_name, designation_id, department, date_of_joining)
    VALUES ('11111111-1111-1111-1111-111111111111', 'EMP-GUARD-001', 'Suresh', 'Patil', v_designation_id, 'Security', '2024-01-01');

    -- Guard Record
    INSERT INTO security_guards (employee_id, guard_code, grade, assigned_location_id, shift_timing)
    VALUES ('11111111-1111-1111-1111-111111111111', 'GRD-001', 'B', v_gate_id, 'day');
END $$;

-- 7. Insert Resident with FIXED ID: 2222...
DO $$
DECLARE
    v_flat_id UUID;
BEGIN
    SELECT f.id INTO v_flat_id 
    FROM flats f JOIN buildings b ON f.building_id = b.id 
    WHERE f.flat_number = '101' AND b.building_code = 'BLD-A' LIMIT 1;

    INSERT INTO residents (id, resident_code, full_name, flat_id, relation, phone, is_primary_contact, is_active)
    VALUES ('22222222-2222-2222-2222-222222222222', 'RES-001', 'Rajesh Kumar', v_flat_id, 'owner', '+91 9876543210', true, true);
    
    -- Visitors
    INSERT INTO visitors (visitor_name, visitor_type, flat_id, resident_id, purpose, entry_time, approved_by_resident)
    VALUES ('Amit Sharma', 'guest', v_flat_id, '22222222-2222-2222-2222-222222222222', 'Family Visit', NOW() - INTERVAL '2 hours', true);
    
    INSERT INTO visitors (visitor_name, visitor_type, flat_id, resident_id, purpose, entry_time, approved_by_resident)
    VALUES ('Delivery Boy', 'vendor', v_flat_id, '22222222-2222-2222-2222-222222222222', 'Package', NULL, true);
END $$;

SELECT '✅ FIXED DATA SYNC COMPLETE - IDs are now correct.' as status;
