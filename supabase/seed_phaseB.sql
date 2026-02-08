-- Phase B Seed Data for Testing (CORRECTED V3)
-- This script populates the database with test data for Phase B features
-- Run this after the Phase B schema has been applied

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ASSET CATEGORIES
-- ============================================
INSERT INTO asset_categories (id, category_code, category_name, description) VALUES
  (uuid_generate_v4(), 'HVAC', 'HVAC Systems', 'Heating, Ventilation, and Air Conditioning equipment'),
  (uuid_generate_v4(), 'ELEC', 'Electrical Systems', 'Electrical systems and equipment'),
  (uuid_generate_v4(), 'PLUMB', 'Plumbing Systems', 'Water supply and drainage systems'),
  (uuid_generate_v4(), 'ELV', 'Elevators & Lifts', 'Lifts and escalators'),
  (uuid_generate_v4(), 'SEC', 'Security Systems', 'Security systems and equipment'),
  (uuid_generate_v4(), 'FIRE', 'Fire Safety', 'Fire detection and suppression systems'),
  (uuid_generate_v4(), 'GYM', 'Gym Equipment', 'Fitness and recreational equipment'),
  (uuid_generate_v4(), 'LAND', 'Landscaping', 'Garden and outdoor maintenance equipment')
ON CONFLICT (category_code) DO NOTHING;

-- ============================================
-- SERVICES
-- ============================================
INSERT INTO services (id, service_code, service_name, service_category, description, is_active) VALUES
  (uuid_generate_v4(), 'AC-REP', 'AC Repair', 'maintenance', 'Air conditioner repair and maintenance', true),
  (uuid_generate_v4(), 'PLM-REP', 'Plumbing Repair', 'maintenance', 'Fix leaks, clogs, and pipe issues', true),
  (uuid_generate_v4(), 'ELC-REP', 'Electrical Work', 'maintenance', 'Electrical repairs and installations', true),
  (uuid_generate_v4(), 'ELV-MNT', 'Elevator Maintenance', 'maintenance', 'Regular elevator servicing', true),
  (uuid_generate_v4(), 'PST-CON', 'Pest Control', 'housekeeping', 'Pest treatment and prevention', true),
  (uuid_generate_v4(), 'DP-CLN', 'Deep Cleaning', 'housekeeping', 'Thorough cleaning service', true),
  (uuid_generate_v4(), 'SEC-CHK', 'Security Check', 'security', 'Security system inspection', true),
  (uuid_generate_v4(), 'FIR-INS', 'Fire Safety Inspection', 'safety', 'Fire equipment and safety check', true),
  (uuid_generate_v4(), 'GYM-SRV', 'Gym Equipment Service', 'maintenance', 'Maintenance of gym machines', true),
  (uuid_generate_v4(), 'GRD-MNT', 'Gardening', 'housekeeping', 'Lawn and garden maintenance', true)
ON CONFLICT (service_code) DO NOTHING;

-- ============================================
-- SAMPLE ASSETS & DEPENDENCIES
-- ============================================
DO $$
DECLARE
  v_society_id UUID;
  v_category_hvac UUID;
  v_category_electrical UUID;
  v_category_elevator UUID;
  v_category_gym UUID;
  v_category_security UUID;
  v_category_fire UUID;
  v_location_id UUID;
BEGIN
  -- Get the first society
  SELECT id INTO v_society_id FROM societies LIMIT 1;
  
  -- Get category IDs
  SELECT id INTO v_category_hvac FROM asset_categories WHERE category_code = 'HVAC' LIMIT 1;
  SELECT id INTO v_category_electrical FROM asset_categories WHERE category_code = 'ELEC' LIMIT 1;
  SELECT id INTO v_category_elevator FROM asset_categories WHERE category_code = 'ELV' LIMIT 1;
  SELECT id INTO v_category_gym FROM asset_categories WHERE category_code = 'GYM' LIMIT 1;
  SELECT id INTO v_category_security FROM asset_categories WHERE category_code = 'SEC' LIMIT 1;
  SELECT id INTO v_category_fire FROM asset_categories WHERE category_code = 'FIRE' LIMIT 1;
  
  -- Get any location
  SELECT id INTO v_location_id FROM company_locations LIMIT 1;
  
  IF v_society_id IS NOT NULL AND v_category_hvac IS NOT NULL AND v_location_id IS NOT NULL THEN
    -- HVAC Assets
    INSERT INTO assets (id, society_id, category_id, location_id, name, asset_code, status, purchase_date, warranty_expiry, specifications) VALUES
      (uuid_generate_v4(), v_society_id, v_category_hvac, v_location_id, 'Central AC Unit - Tower A', 'AST-HVAC01', 'functional', '2022-06-15', '2027-06-15', '{"capacity": "5 ton", "brand": "Daikin", "model": "VRV-X"}'),
      (uuid_generate_v4(), v_society_id, v_category_hvac, v_location_id, 'Central AC Unit - Tower B', 'AST-HVAC02', 'functional', '2022-06-15', '2027-06-15', '{"capacity": "5 ton", "brand": "Daikin", "model": "VRV-X"}'),
      (uuid_generate_v4(), v_society_id, v_category_hvac, v_location_id, 'AC Unit - Clubhouse', 'AST-HVAC03', 'under_maintenance', '2021-03-10', '2026-03-10', '{"capacity": "3 ton", "brand": "Carrier", "model": "42LCM"}'),
      (uuid_generate_v4(), v_society_id, v_category_hvac, v_location_id, 'AC Unit - Gym', 'AST-HVAC04', 'functional', '2023-01-20', '2028-01-20', '{"capacity": "2 ton", "brand": "LG", "model": "ARNU28GTRPA"}')
    ON CONFLICT (asset_code) DO NOTHING;
    
    -- Elevator Assets
    INSERT INTO assets (id, society_id, category_id, location_id, name, asset_code, status, purchase_date, warranty_expiry, specifications) VALUES
      (uuid_generate_v4(), v_society_id, v_category_elevator, v_location_id, 'Elevator - Tower A Lobby', 'AST-ELV01', 'functional', '2020-12-01', '2030-12-01', '{"capacity": "8 persons", "brand": "Otis", "type": "Passenger", "floors": 12}'),
      (uuid_generate_v4(), v_society_id, v_category_elevator, v_location_id, 'Elevator - Tower B Service', 'AST-ELV02', 'under_maintenance', '2020-12-01', '2030-12-01', '{"capacity": "1000 kg", "brand": "Otis", "type": "Service", "floors": 12}')
    ON CONFLICT (asset_code) DO NOTHING;
    
    -- Electrical Assets
    INSERT INTO assets (id, society_id, category_id, location_id, name, asset_code, status, purchase_date, warranty_expiry, specifications) VALUES
      (uuid_generate_v4(), v_society_id, v_category_electrical, v_location_id, 'DG Set - 500 KVA', 'AST-ELC01', 'functional', '2020-06-01', '2025-06-01', '{"capacity": "500 KVA", "brand": "Cummins", "fuel": "Diesel"}'),
      (uuid_generate_v4(), v_society_id, v_category_electrical, v_location_id, 'Main Transformer', 'AST-ELC02', 'functional', '2020-01-15', '2035-01-15', '{"capacity": "1000 KVA", "voltage": "11kV/440V"}')
    ON CONFLICT (asset_code) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- SAMPLE SERVICE REQUESTS
-- ============================================
DO $$
DECLARE
  v_society_id UUID;
  v_asset_id UUID;
  v_service_id UUID;
  v_location_id UUID;
  v_employee_id UUID;
BEGIN
  -- Get references
  SELECT id INTO v_society_id FROM societies LIMIT 1;
  SELECT id INTO v_asset_id FROM assets WHERE status = 'under_maintenance' LIMIT 1;
  SELECT id INTO v_service_id FROM services WHERE service_code = 'AC-REP' LIMIT 1;
  SELECT id INTO v_location_id FROM company_locations LIMIT 1;
  SELECT id INTO v_employee_id FROM employees WHERE is_active = true LIMIT 1;
  
  IF v_society_id IS NOT NULL THEN
    -- Create sample service requests
    INSERT INTO service_requests (id, request_number, society_id, location_id, asset_id, service_id, assigned_to, title, description, status, priority, scheduled_date) VALUES
      (uuid_generate_v4(), 'SR-2026-00001', v_society_id, v_location_id, v_asset_id, v_service_id, v_employee_id, 'AC not cooling properly', 'The AC in the clubhouse is running but not providing adequate cooling.', 'in_progress', 'high', CURRENT_DATE + INTERVAL '1 day'),
      (uuid_generate_v4(), 'SR-2026-00002', v_society_id, v_location_id, NULL, (SELECT id FROM services WHERE service_code = 'PLM-REP' LIMIT 1), v_employee_id, 'Leaking tap', 'The tap in the ground floor common bathroom is continuously leaking.', 'open', 'normal', NULL)
    ON CONFLICT (request_number) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- SAMPLE MAINTENANCE SCHEDULES
-- ============================================
DO $$
DECLARE
  v_asset RECORD;
BEGIN
  FOR v_asset IN SELECT id, name FROM assets
  LOOP
    INSERT INTO maintenance_schedules (id, asset_id, task_name, task_description, frequency, next_due_date, is_active) 
    VALUES (
      uuid_generate_v4(),
      v_asset.id,
      'Monthly Inspection - ' || v_asset.name,
      'Routine safety and performance check',
      'monthly',
      CURRENT_DATE + INTERVAL '15 days',
      true
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- INVENTORY (Products & Stock)
-- ============================================
-- First ensure products exist (from Phase A schema dependency)
INSERT INTO products (id, product_code, product_name, unit) VALUES
  (uuid_generate_v4(), 'PRD-AC-FLT', 'AC Filter', 'piece'),
  (uuid_generate_v4(), 'PRD-BULB-12W', 'LED Bulb 12W', 'piece')
ON CONFLICT (product_code) DO NOTHING;

-- Warehouses
DO $$
DECLARE
  v_loc_id UUID;
  v_soc_id UUID;
BEGIN
  SELECT id INTO v_loc_id FROM company_locations LIMIT 1;
  SELECT id INTO v_soc_id FROM societies LIMIT 1;
  
  IF v_loc_id IS NOT NULL THEN
    INSERT INTO warehouses (id, warehouse_code, warehouse_name, location_id, society_id) VALUES
      (uuid_generate_v4(), 'WH-MAIN', 'Main Maintenance Store', v_loc_id, v_soc_id)
    ON CONFLICT (warehouse_code) DO NOTHING;
  END IF;
END $$;

-- Stock Batches
DO $$
DECLARE
  v_wh_id UUID;
  v_prd_id UUID;
BEGIN
  SELECT id INTO v_wh_id FROM warehouses WHERE warehouse_code = 'WH-MAIN' LIMIT 1;
  SELECT id INTO v_prd_id FROM products WHERE product_code = 'PRD-AC-FLT' LIMIT 1;
  
  IF v_wh_id IS NOT NULL AND v_prd_id IS NOT NULL THEN
    INSERT INTO stock_batches (id, batch_number, product_id, warehouse_id, initial_quantity, current_quantity, unit_cost, status) VALUES
      (uuid_generate_v4(), 'BAT-2026-001', v_prd_id, v_wh_id, 100, 85, 350.00, 'active')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- QR CODES
-- ============================================
DO $$
DECLARE
  v_asset RECORD;
BEGIN
  FOR v_asset IN SELECT id, asset_code FROM assets
  LOOP
    -- Triggers in schema might auto-create, but we can do it explicitly for seed
    INSERT INTO qr_codes (id, asset_id, society_id)
    VALUES (
      uuid_generate_v4(),
      v_asset.id,
      (SELECT society_id FROM assets WHERE id = v_asset.id)
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Phase B seed data has been successfully inserted!';
END $$;
