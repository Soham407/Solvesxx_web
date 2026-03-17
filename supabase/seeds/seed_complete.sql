-- =============================================================================
-- FacilityPro — Complete Test Seed Data
-- Run AFTER seed_guard_data.sql and seed_operations.sql
-- Safe to re-run: all inserts use ON CONFLICT DO NOTHING or WHERE NOT EXISTS
--
-- Test Accounts (password: Test@1234 for all):
--   admin@test.com       → admin             (pre-existing)
--   guard@test.com       → security_guard    (pre-existing)
--   resident@test.com    → resident          (pre-existing)
--   buyer@test.com       → buyer
--   supplier@test.com    → supplier
--   hod@test.com         → company_hod
--   md@test.com          → company_md
--   account@test.com     → account
--   delivery@test.com    → delivery_boy
--   storekeeper@test.com → storekeeper
--   supervisor@test.com  → security_supervisor
--   serviceboy@test.com  → service_boy
--
-- Fixed UUID prefixes used (all valid hex):
--   Auth/Public users:  aaaa0001-0000-0000-0000-00000000000x
--   Employees:          eeee0001-0000-0000-0000-00000000000x
--   Products (new):     generated dynamically with WHERE NOT EXISTS
--   Suppliers (new):    generated dynamically with WHERE NOT EXISTS
-- =============================================================================

-- =============================================================================
-- SECTION 1: MISSING ROLES
-- =============================================================================
INSERT INTO roles (role_name, role_display_name, is_active) VALUES
  ('company_md',   'Company MD',   true),
  ('company_hod',  'Company HOD',  true),
  ('delivery_boy', 'Delivery Boy', true),
  ('service_boy',  'Service Boy',  true)
ON CONFLICT (role_name) DO NOTHING;

-- =============================================================================
-- SECTION 2: DESIGNATIONS
-- =============================================================================
INSERT INTO designations (designation_code, designation_name, department, is_active) VALUES
  ('DESG-HOD',  'Head of Department',       'Operations',   true),
  ('DESG-MD',   'Managing Director',        'Management',   true),
  ('DESG-ACCT', 'Account Manager',          'Finance',      true),
  ('DESG-DEL',  'Delivery Boy',             'Logistics',    true),
  ('DESG-SB',   'Service Boy',              'Services',     true),
  ('DESG-SK',   'Storekeeper',              'Inventory',    true),
  ('DESG-SUPS', 'Site Supervisor',          'Security',     true),
  ('DESG-ACT',  'AC Technician',            'Services',     true),
  ('DESG-PCT',  'Pest Control Technician',  'Services',     true),
  ('DESG-BUY',  'Procurement Officer',      'Procurement',  true),
  ('DESG-VSUP', 'Supplier Representative',  'Supply Chain', true)
ON CONFLICT (designation_code) DO NOTHING;

-- =============================================================================
-- SECTION 3: AUTH USERS (9 new accounts; resident@test.com already exists)
-- NOTE: Uses pgcrypto crypt() for bcrypt password hashing
-- =============================================================================
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
SELECT
  id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  email, crypt('Test@1234', gen_salt('bf', 10)),
  now(), '{"provider":"email","providers":["email"]}'::jsonb,
  json_build_object('full_name', full_name)::jsonb,
  now(), now(), '', '', '', ''
FROM (VALUES
  ('aaaa0001-0000-0000-0000-000000000001', 'buyer@test.com',        'Priya Sharma'),
  ('aaaa0001-0000-0000-0000-000000000002', 'supplier@test.com',     'Ramesh Patel'),
  ('aaaa0001-0000-0000-0000-000000000003', 'hod@test.com',          'Anita Desai'),
  ('aaaa0001-0000-0000-0000-000000000004', 'md@test.com',           'Vikram Mehta'),
  ('aaaa0001-0000-0000-0000-000000000005', 'account@test.com',      'Sunita Joshi'),
  ('aaaa0001-0000-0000-0000-000000000006', 'delivery@test.com',     'Raju Kumar'),
  ('aaaa0001-0000-0000-0000-000000000008', 'storekeeper@test.com',  'Dinesh Rao'),
  ('aaaa0001-0000-0000-0000-000000000009', 'supervisor@test.com',   'Mohan Verma'),
  ('aaaa0001-0000-0000-0000-000000000010', 'serviceboy@test.com',   'Anil Thakur')
) AS t(id, email, full_name)
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE auth.users.email = t.email);

-- Auth identities for email login
INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
SELECT
  gen_random_uuid(), id::uuid,
  json_build_object('sub', id, 'email', email)::jsonb,
  'email', now(), now(), now(), id
FROM (VALUES
  ('aaaa0001-0000-0000-0000-000000000001', 'buyer@test.com'),
  ('aaaa0001-0000-0000-0000-000000000002', 'supplier@test.com'),
  ('aaaa0001-0000-0000-0000-000000000003', 'hod@test.com'),
  ('aaaa0001-0000-0000-0000-000000000004', 'md@test.com'),
  ('aaaa0001-0000-0000-0000-000000000005', 'account@test.com'),
  ('aaaa0001-0000-0000-0000-000000000006', 'delivery@test.com'),
  ('aaaa0001-0000-0000-0000-000000000008', 'storekeeper@test.com'),
  ('aaaa0001-0000-0000-0000-000000000009', 'supervisor@test.com'),
  ('aaaa0001-0000-0000-0000-000000000010', 'serviceboy@test.com')
) AS t(id, email)
WHERE NOT EXISTS (SELECT 1 FROM auth.identities WHERE auth.identities.provider_id = t.id);

-- =============================================================================
-- SECTION 4: PUBLIC USERS (role assignments)
-- Resident already exists (78bf3c75-05e6-411c-8645-82baa99f7f19)
-- =============================================================================
INSERT INTO users (id, email, role_id, is_active, created_at)
SELECT
  t.id::uuid, t.email,
  (SELECT id FROM roles WHERE role_name = t.role_name LIMIT 1),
  true, now()
FROM (VALUES
  ('aaaa0001-0000-0000-0000-000000000001', 'buyer@test.com',        'buyer'),
  ('aaaa0001-0000-0000-0000-000000000002', 'supplier@test.com',     'supplier'),
  ('aaaa0001-0000-0000-0000-000000000003', 'hod@test.com',          'company_hod'),
  ('aaaa0001-0000-0000-0000-000000000004', 'md@test.com',           'company_md'),
  ('aaaa0001-0000-0000-0000-000000000005', 'account@test.com',      'account'),
  ('aaaa0001-0000-0000-0000-000000000006', 'delivery@test.com',     'delivery_boy'),
  ('aaaa0001-0000-0000-0000-000000000008', 'storekeeper@test.com',  'storekeeper'),
  ('aaaa0001-0000-0000-0000-000000000009', 'supervisor@test.com',   'security_supervisor'),
  ('aaaa0001-0000-0000-0000-000000000010', 'serviceboy@test.com',   'service_boy')
) AS t(id, email, role_name)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SECTION 5: EMPLOYEES
-- employee.id is separate from users.id; linked via auth_user_id
-- =============================================================================
INSERT INTO employees (id, employee_code, first_name, last_name, email, department, designation_id, employment_status, created_at)
SELECT
  emp_id::uuid, emp_code, first_nm, last_nm, email,
  dept,
  (SELECT id FROM designations WHERE designation_code = desg_code LIMIT 1),
  'active', now()
FROM (VALUES
  ('eeee0001-0000-0000-0000-000000000001', 'EMP-BUY-001', 'Priya',  'Sharma',  'buyer@test.com',        'Procurement',  'DESG-BUY'),
  ('eeee0001-0000-0000-0000-000000000002', 'EMP-SUP-001', 'Ramesh', 'Patel',   'supplier@test.com',     'Supply Chain', 'DESG-VSUP'),
  ('eeee0001-0000-0000-0000-000000000003', 'EMP-HOD-001', 'Anita',  'Desai',   'hod@test.com',          'Operations',   'DESG-HOD'),
  ('eeee0001-0000-0000-0000-000000000004', 'EMP-MD-001',  'Vikram', 'Mehta',   'md@test.com',           'Management',   'DESG-MD'),
  ('eeee0001-0000-0000-0000-000000000005', 'EMP-ACC-001', 'Sunita', 'Joshi',   'account@test.com',      'Finance',      'DESG-ACCT'),
  ('eeee0001-0000-0000-0000-000000000006', 'EMP-DEL-001', 'Raju',   'Kumar',   'delivery@test.com',     'Logistics',    'DESG-DEL'),
  ('eeee0001-0000-0000-0000-000000000008', 'EMP-SK-001',  'Dinesh', 'Rao',     'storekeeper@test.com',  'Inventory',    'DESG-SK'),
  ('eeee0001-0000-0000-0000-000000000009', 'EMP-SS-001',  'Mohan',  'Verma',   'supervisor@test.com',   'Security',     'DESG-SUPS'),
  ('eeee0001-0000-0000-0000-000000000010', 'EMP-SB-001',  'Anil',   'Thakur',  'serviceboy@test.com',   'Services',     'DESG-SB'),
  ('eeee0001-0000-0000-0000-000000000011', 'EMP-ACT-001', 'Ravi',   'Sharma',  'actech@test.com',       'Services',     'DESG-ACT'),
  ('eeee0001-0000-0000-0000-000000000012', 'EMP-PCT-001', 'Mohan',  'Das',     'pesttech@test.com',     'Services',     'DESG-PCT'),
  ('eeee0001-0000-0000-0000-000000000013', 'EMP-SGS-001', 'Vikram', 'Singh',   'secguard2@test.com',    'Security',     'DESG-SUPS')
) AS t(emp_id, emp_code, first_nm, last_nm, email, dept, desg_code)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SECTION 6: PRODUCT CATEGORIES (expand to cover all product types)
-- =============================================================================
INSERT INTO product_categories (category_code, category_name, is_active) VALUES
  ('CAT-HK',   'Housekeeping Supplies',    true),
  ('CAT-SAFE', 'Safety Equipment',         true),
  ('CAT-ELEC', 'Electrical',               true),
  ('CAT-PLMB', 'Plumbing',                 true),
  ('CAT-PEST', 'Pest Control',             true),
  ('CAT-PNTR', 'Pantry Supplies',          true),
  ('CAT-PRNT', 'Printing & Stationery',    true),
  ('CAT-SEC',  'Security Equipment',       true)
ON CONFLICT (category_code) DO NOTHING;

-- =============================================================================
-- SECTION 7: PRODUCTS (15 more beyond existing 5)
-- Uses WHERE NOT EXISTS since products has no unique constraint on product_code
-- =============================================================================
DO $$
DECLARE v_hk uuid; v_safe uuid; v_elec uuid; v_plmb uuid;
        v_pest uuid; v_pntr uuid; v_prnt uuid; v_sec uuid;
BEGIN
  SELECT id INTO v_hk   FROM product_categories WHERE category_code = 'CAT-HK'   LIMIT 1;
  SELECT id INTO v_safe FROM product_categories WHERE category_code = 'CAT-SAFE' LIMIT 1;
  SELECT id INTO v_elec FROM product_categories WHERE category_code = 'CAT-ELEC' LIMIT 1;
  SELECT id INTO v_plmb FROM product_categories WHERE category_code = 'CAT-PLMB' LIMIT 1;
  SELECT id INTO v_pest FROM product_categories WHERE category_code = 'CAT-PEST' LIMIT 1;
  SELECT id INTO v_pntr FROM product_categories WHERE category_code = 'CAT-PNTR' LIMIT 1;
  SELECT id INTO v_prnt FROM product_categories WHERE category_code = 'CAT-PRNT' LIMIT 1;
  SELECT id INTO v_sec  FROM product_categories WHERE category_code = 'CAT-SEC'  LIMIT 1;

  INSERT INTO products (product_code, product_name, category_id, unit_of_measurement, is_active)
  SELECT v.code, v.name, v.cat, v.uom, true
  FROM (VALUES
    ('PRD-HK-MOP',    'Mop Set (Spin Mop)',          v_hk,   'Nos'),
    ('PRD-HK-BRM',    'Heavy Duty Broom',             v_hk,   'Nos'),
    ('PRD-HK-CLN',    'Floor Cleaning Liquid 5L',     v_hk,   'Can'),
    ('PRD-HK-SAN',    'Sanitizer 5L',                 v_hk,   'Can'),
    ('PRD-SAFE-GLV',  'Safety Gloves (Pair)',         v_safe, 'Pair'),
    ('PRD-SAFE-HLM',  'Safety Helmet',                v_safe, 'Nos'),
    ('PRD-SAFE-FAK',  'First Aid Kit Standard',       v_safe, 'Nos'),
    ('PRD-ELEC-EXT',  'Extension Cable 10m',          v_elec, 'Nos'),
    ('PRD-ELEC-MCB',  'MCB 32A Single Pole',          v_elec, 'Nos'),
    ('PRD-PLMB-PVC',  'PVC Pipe 1inch 3m',            v_plmb, 'Nos'),
    ('PRD-PEST-SPR',  'Pest Spray 500ml',             v_pest, 'Bottle'),
    ('PRD-PNTR-CUP',  'Paper Cups 100pcs',            v_pntr, 'Pack'),
    ('PRD-PRNT-A4',   'A4 Paper Ream 500pcs',         v_prnt, 'Ream'),
    ('PRD-PRNT-INK',  'Printer Ink Cartridge',        v_prnt, 'Nos'),
    ('PRD-SEC-CCTV',  'CCTV Camera HD',               v_sec,  'Nos')
  ) AS v(code, name, cat, uom)
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE product_code = v.code);
END $$;

-- =============================================================================
-- SECTION 8: SUPPLIERS (5 more)
-- =============================================================================
DO $$
BEGIN
  INSERT INTO suppliers (supplier_code, supplier_name, contact_email, contact_phone, is_active, created_at)
  SELECT v.code, v.name, v.email, v.phone, true, now()
  FROM (VALUES
    ('SUP-HK-001',   'CleanCo Supplies Pvt Ltd',   'orders@cleanco.in',       '+91-9900001111', true),
    ('SUP-SEC-001',  'SafeGuard Security Ltd',      'supply@safeguard.in',     '+91-9900002222', true),
    ('SUP-ELEC-001', 'ElectroFix Pvt Ltd',          'sales@electrofix.in',     '+91-9900003333', true),
    ('SUP-PRNT-001', 'PrintMaster India',           'orders@printmaster.in',   '+91-9900004444', true),
    ('SUP-PEST-001', 'PestAway Solutions',          'chemicals@pestaway.in',   '+91-9900005555', true)
  ) AS v(code, name, email, phone, active)
  WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE supplier_code = v.code);
END $$;

-- =============================================================================
-- SECTION 9: WAREHOUSES (2 more)
-- =============================================================================
INSERT INTO warehouses (warehouse_code, warehouse_name, location, is_active, created_at)
VALUES
  ('WH-SEC',  'Security Store',  'Gate House Storage Room', true, now()),
  ('WH-PNTR', 'Pantry Store',    'Kitchen Block B1',         true, now())
ON CONFLICT (warehouse_code) DO NOTHING;

-- =============================================================================
-- SECTION 10: REORDER RULES (one per product per warehouse for WH-MAIN)
-- Unique constraint: (product_id, warehouse_id)
-- =============================================================================
DO $$
DECLARE v_wh uuid;
BEGIN
  SELECT id INTO v_wh FROM warehouses WHERE warehouse_code = 'WH-MAIN' LIMIT 1;
  INSERT INTO reorder_rules (product_id, warehouse_id, reorder_level, reorder_quantity, is_active, created_at)
  SELECT p.id, v_wh, 10, 50, true, now()
  FROM products p
  WHERE NOT EXISTS (
    SELECT 1 FROM reorder_rules rr WHERE rr.product_id = p.id AND rr.warehouse_id = v_wh
  );
END $$;

-- =============================================================================
-- SECTION 11: STOCK BATCHES (2-3 batches per key product, some below reorder level)
-- Unique constraint: (batch_number, product_id, warehouse_id)
-- =============================================================================
DO $$
DECLARE v_wh uuid; v_admin uuid;
BEGIN
  SELECT id INTO v_wh    FROM warehouses WHERE warehouse_code = 'WH-MAIN' LIMIT 1;
  SELECT id INTO v_admin FROM users WHERE email = 'admin@test.com' LIMIT 1;

  INSERT INTO stock_batches (batch_number, product_id, warehouse_id, quantity, unit_of_measurement, received_date, expiry_date, unit_cost_paise, created_by, created_at)
  SELECT v.batch, p.id, v_wh, v.qty, v.uom, v.recv::date, v.exp::date, v.cost, v_admin, now()
  FROM (VALUES
    ('BAT-HK-MOP-01',   'PRD-HK-MOP',   45, 'Nos',    '2026-01-10', NULL,         35000),
    ('BAT-HK-BRM-01',   'PRD-HK-BRM',   8,  'Nos',    '2026-02-01', NULL,         15000),
    ('BAT-HK-CLN-01',   'PRD-HK-CLN',   12, 'Can',    '2026-01-15', '2026-12-31', 45000),
    ('BAT-HK-CLN-02',   'PRD-HK-CLN',   5,  'Can',    '2026-02-20', '2027-02-28', 46000),
    ('BAT-HK-SAN-01',   'PRD-HK-SAN',   6,  'Can',    '2026-02-05', '2026-08-31', 55000),
    ('BAT-SAFE-GLV-01', 'PRD-SAFE-GLV', 30, 'Pair',   '2026-01-20', NULL,         12000),
    ('BAT-SAFE-HLM-01', 'PRD-SAFE-HLM', 3,  'Nos',    '2026-01-25', NULL,         28000),
    ('BAT-SAFE-FAK-01', 'PRD-SAFE-FAK', 4,  'Nos',    '2026-02-10', '2028-02-28', 85000),
    ('BAT-ELEC-EXT-01', 'PRD-ELEC-EXT', 7,  'Nos',    '2026-02-15', NULL,         38000),
    ('BAT-PRNT-A4-01',  'PRD-PRNT-A4',  25, 'Ream',   '2026-02-28', NULL,         32000),
    ('BAT-PRNT-INK-01', 'PRD-PRNT-INK', 2,  'Nos',    '2026-03-01', NULL,         120000),
    ('BAT-SEC-CCTV-01', 'PRD-SEC-CCTV', 5,  'Nos',    '2026-01-05', NULL,         850000)
  ) AS v(batch, prod_code, qty, uom, recv, exp, cost)
  JOIN products p ON p.product_code = v.prod_code
  WHERE NOT EXISTS (
    SELECT 1 FROM stock_batches sb
    WHERE sb.batch_number = v.batch AND sb.product_id = p.id AND sb.warehouse_id = v_wh
  );
END $$;

-- =============================================================================
-- SECTION 12: HOLIDAYS (2026)
-- =============================================================================
INSERT INTO holidays (holiday_name, holiday_date, holiday_type, is_active, created_at)
VALUES
  ('Republic Day',       '2026-01-26', 'national', true, now()),
  ('Holi',               '2026-03-03', 'national', true, now()),
  ('Good Friday',        '2026-04-03', 'national', true, now()),
  ('Ambedkar Jayanti',   '2026-04-14', 'national', true, now()),
  ('Maharashtra Day',    '2026-05-01', 'optional', true, now()),
  ('Independence Day',   '2026-08-15', 'national', true, now()),
  ('Gandhi Jayanti',     '2026-10-02', 'national', true, now()),
  ('Dussehra',           '2026-10-02', 'national', true, now()),
  ('Diwali',             '2026-10-20', 'national', true, now()),
  ('Christmas',          '2026-12-25', 'national', true, now())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SECTION 13: BUYER REQUESTS (full pipeline, 6 requests)
-- requests.buyer_id → users.id
-- =============================================================================
DO $$
DECLARE
  v_buyer   uuid := 'aaaa0001-0000-0000-0000-000000000001'::uuid;
  v_hod     uuid := 'aaaa0001-0000-0000-0000-000000000003'::uuid;
  v_admin   uuid;
  v_req1    uuid := 'bb010001-0000-0000-0000-000000000001'::uuid;
  v_req2    uuid := 'bb010001-0000-0000-0000-000000000002'::uuid;
  v_req3    uuid := 'bb010001-0000-0000-0000-000000000003'::uuid;
  v_req4    uuid := 'bb010001-0000-0000-0000-000000000004'::uuid;
  v_req5    uuid := 'bb010001-0000-0000-0000-000000000005'::uuid;
  v_req6    uuid := 'bb010001-0000-0000-0000-000000000006'::uuid;
  v_ind3    uuid := 'cc010001-0000-0000-0000-000000000003'::uuid;
  v_ind4    uuid := 'cc010001-0000-0000-0000-000000000004'::uuid;
  v_ind5    uuid := 'cc010001-0000-0000-0000-000000000005'::uuid;
  v_po4     uuid;
  v_po5     uuid;
  v_emp_buy uuid := 'eeee0001-0000-0000-0000-000000000001'::uuid;
  v_emp_hod uuid := 'eeee0001-0000-0000-0000-000000000003'::uuid;
  v_sup1    uuid;
  v_prod_mop uuid; v_prod_glv uuid; v_prod_cln uuid; v_prod_hlm uuid;
BEGIN
  SELECT id INTO v_admin FROM users WHERE email = 'admin@test.com' LIMIT 1;
  SELECT id INTO v_sup1  FROM suppliers WHERE supplier_code = 'SUP-HK-001' LIMIT 1;
  SELECT id INTO v_prod_mop FROM products WHERE product_code = 'PRD-HK-MOP' LIMIT 1;
  SELECT id INTO v_prod_glv FROM products WHERE product_code = 'PRD-SAFE-GLV' LIMIT 1;
  SELECT id INTO v_prod_cln FROM products WHERE product_code = 'PRD-HK-CLN' LIMIT 1;
  SELECT id INTO v_prod_hlm FROM products WHERE product_code = 'PRD-SAFE-HLM' LIMIT 1;

  -- Requests
  INSERT INTO requests (id, request_number, buyer_id, title, description, status, priority, required_by, created_at)
  VALUES
    (v_req1, 'REQ-2026-001', v_buyer, 'Housekeeping Supplies Restock', 'Monthly restock of mops and cleaning liquids', 'pending',    'medium', '2026-04-01', now() - interval '5 days'),
    (v_req2, 'REQ-2026-002', v_buyer, 'Safety Equipment Q2',           'Safety gloves and helmets for maintenance crew', 'accepted',  'high',   '2026-03-25', now() - interval '4 days'),
    (v_req3, 'REQ-2026-003', v_buyer, 'Office Cleaning Supplies',      'Floor cleaning liquid reorder', 'indent_generated',           'low',    '2026-04-15', now() - interval '7 days'),
    (v_req4, 'REQ-2026-004', v_buyer, 'Security Gear Procurement',     'Helmets and first aid kits for security staff', 'po_issued',  'high',   '2026-03-30', now() - interval '10 days'),
    (v_req5, 'REQ-2026-005', v_buyer, 'Sanitizer Restock',             'Bulk sanitizer reorder for all wings', 'feedback_pending',    'medium', '2026-03-20', now() - interval '15 days'),
    (v_req6, 'REQ-2026-006', v_buyer, 'Emergency Safety Kit',          'Emergency first aid kits for gym and pool', 'completed',      'high',   '2026-03-10', now() - interval '20 days')
  ON CONFLICT DO NOTHING;

  -- Request items
  INSERT INTO request_items (request_id, product_id, quantity, unit_of_measurement, estimated_unit_price_paise)
  SELECT req_id::uuid, prod_id, qty, uom, price
  FROM (VALUES
    (v_req1::text, v_prod_mop::text, 10, 'Nos',  35000),
    (v_req1::text, v_prod_cln::text, 5,  'Can',  45000),
    (v_req2::text, v_prod_glv::text, 20, 'Pair', 12000),
    (v_req2::text, v_prod_hlm::text, 5,  'Nos',  28000),
    (v_req3::text, v_prod_cln::text, 10, 'Can',  45000),
    (v_req4::text, v_prod_hlm::text, 8,  'Nos',  28000),
    (v_req5::text, v_prod_cln::text, 20, 'Can',  44000),
    (v_req6::text, v_prod_glv::text, 15, 'Pair', 12000)
  ) AS t(req_id, prod_id, qty, uom, price)
  WHERE NOT EXISTS (
    SELECT 1 FROM request_items ri WHERE ri.request_id = t.req_id::uuid AND ri.product_id = t.prod_id::uuid
  );

  -- Indents for REQ-003, REQ-004, REQ-005
  -- indents.requester_id → employees.id, indents.approved_by → users.id
  INSERT INTO indents (id, indent_number, request_id, requester_id, approved_by, status, notes, created_at)
  VALUES
    (v_ind3, 'IND-2026-003', v_req3, v_emp_buy, v_hod, 'approved', 'Approved for Q1 cleaning supply run', now() - interval '6 days'),
    (v_ind4, 'IND-2026-004', v_req4, v_emp_buy, v_hod, 'approved', 'Urgent safety gear — fast tracked', now() - interval '9 days'),
    (v_ind5, 'IND-2026-005', v_req5, v_emp_buy, v_hod, 'approved', 'Sanitizer bulk order', now() - interval '14 days')
  ON CONFLICT DO NOTHING;

  -- Indent items
  INSERT INTO indent_items (indent_id, product_id, approved_quantity, unit_of_measurement)
  SELECT ind_id::uuid, prod_id::uuid, qty, uom
  FROM (VALUES
    (v_ind3::text, v_prod_cln::text, 10, 'Can'),
    (v_ind4::text, v_prod_hlm::text, 8,  'Nos'),
    (v_ind5::text, v_prod_cln::text, 20, 'Can')
  ) AS t(ind_id, prod_id, qty, uom)
  WHERE NOT EXISTS (
    SELECT 1 FROM indent_items ii WHERE ii.indent_id = t.ind_id::uuid AND ii.product_id = t.prod_id::uuid
  );

  -- Purchase Orders for REQ-004, REQ-005
  INSERT INTO purchase_orders (id, po_number, indent_id, supplier_id, status, total_amount_paise, created_by, created_at)
  VALUES
    ('d1983bab-6177-441f-9063-cf50f1916a25'::uuid, 'PO-2026-004', v_ind4, v_sup1, 'issued',    224000, v_admin, now() - interval '8 days'),
    ('f5c66281-afa2-4996-a749-06d41151844b'::uuid, 'PO-2026-005', v_ind5, v_sup1, 'delivered', 880000, v_admin, now() - interval '13 days')
  ON CONFLICT DO NOTHING;

  -- PO items
  INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_of_measurement, unit_price_paise, total_price_paise)
  SELECT po_id::uuid, prod_id::uuid, qty, uom, unit_p, total_p
  FROM (VALUES
    ('d1983bab-6177-441f-9063-cf50f1916a25', v_prod_hlm::text, 8,  'Nos', 28000, 224000),
    ('f5c66281-afa2-4996-a749-06d41151844b', v_prod_cln::text, 20, 'Can', 44000, 880000)
  ) AS t(po_id, prod_id, qty, uom, unit_p, total_p)
  WHERE NOT EXISTS (
    SELECT 1 FROM purchase_order_items poi WHERE poi.po_id = t.po_id::uuid AND poi.product_id = t.prod_id::uuid
  );

END $$;

-- =============================================================================
-- SECTION 14: BUYER FEEDBACK (for REQ-2026-006 completed request)
-- =============================================================================
DO $$
DECLARE v_req6 uuid := 'bb010001-0000-0000-0000-000000000006'::uuid;
        v_buyer uuid := 'aaaa0001-0000-0000-0000-000000000001'::uuid;
BEGIN
  INSERT INTO buyer_feedback (request_id, buyer_id, rating, comments, created_at)
  VALUES (v_req6, v_buyer, 4, 'Good quality products delivered on time. Packaging could be better.', now() - interval '5 days')
  ON CONFLICT DO NOTHING;
END $$;

-- =============================================================================
-- SECTION 15: SERVICE PURCHASE ORDERS (3 SPOs)
-- service_purchase_orders.created_by → users.id
-- service_purchase_orders.vendor_id  → suppliers.id
-- =============================================================================
DO $$
DECLARE
  v_admin   uuid;
  v_sec_sup uuid;
  v_pest_sup uuid;
  v_ac_sup   uuid;
  v_sec_svc  uuid;
  v_pest_svc uuid;
  v_ac_svc   uuid;
  v_spo1 uuid := 'ee010001-0000-0000-0000-000000000001'::uuid;
  v_spo2 uuid := 'ee010001-0000-0000-0000-000000000002'::uuid;
  v_spo3 uuid := 'ee010001-0000-0000-0000-000000000003'::uuid;
BEGIN
  SELECT id INTO v_admin    FROM users     WHERE email = 'admin@test.com' LIMIT 1;
  SELECT id INTO v_sec_sup  FROM suppliers WHERE supplier_code = 'SUP-SEC-001'  LIMIT 1;
  SELECT id INTO v_pest_sup FROM suppliers WHERE supplier_code = 'SUP-PEST-001' LIMIT 1;
  SELECT id INTO v_ac_sup   FROM suppliers WHERE supplier_code LIKE '%80fcb%' OR supplier_name ILIKE '%Global Security%' LIMIT 1;
  SELECT id INTO v_sec_svc  FROM services  WHERE service_code = 'SEC-GRD' LIMIT 1;
  SELECT id INTO v_pest_svc FROM services  WHERE service_code = 'PST-CON' LIMIT 1;
  SELECT id INTO v_ac_svc   FROM services  WHERE service_code = 'AC-REP'  LIMIT 1;

  INSERT INTO service_purchase_orders (id, spo_number, service_id, vendor_id, status, start_date, end_date, total_value_paise, created_by, created_at)
  VALUES
    (v_spo1, 'SPO-2026-001', v_sec_svc,  v_sec_sup,  'issued',       '2026-03-01', '2026-05-31', 45000000, v_admin, now() - interval '15 days'),
    (v_spo2, 'SPO-2026-002', v_pest_svc, v_pest_sup, 'acknowledged', '2026-03-10', '2026-04-10', 12000000, v_admin, now() - interval '10 days'),
    (v_spo3, 'SPO-2026-003', v_ac_svc,   v_ac_sup,   'completed',    '2026-02-01', '2026-02-28', 8500000,  v_admin, now() - interval '20 days')
  ON CONFLICT DO NOTHING;

  -- SPO items for SPO-001 (Security Guards)
  INSERT INTO service_purchase_order_items (spo_id, description, quantity, unit, rate_paise, amount_paise)
  VALUES
    (v_spo1, 'Security Guard Grade A',  5, 'Person/Month', 6000000, 30000000),
    (v_spo1, 'Security Guard Grade B',  3, 'Person/Month', 5000000, 15000000)
  ON CONFLICT DO NOTHING;
END $$;

-- Service acknowledgment for SPO-003
DO $$
DECLARE
  v_spo3    uuid := 'ee010001-0000-0000-0000-000000000003'::uuid;
  v_admin   uuid;
  v_sup     uuid := 'aaaa0001-0000-0000-0000-000000000002'::uuid;
BEGIN
  SELECT id INTO v_admin FROM users WHERE email = 'admin@test.com' LIMIT 1;
  INSERT INTO service_acknowledgments (spo_id, acknowledged_by, acknowledged_at, remarks, status, created_at)
  VALUES (v_spo3, v_sup, now() - interval '5 days', 'AC maintenance completed for all 3 towers. All units serviced.', 'approved', now() - interval '5 days')
  ON CONFLICT DO NOTHING;
END $$;

-- =============================================================================
-- SECTION 16: TECHNICIAN PROFILES (3 more employees)
-- specialization CHECK: 'ac' | 'pest_control' | 'plumbing' | 'electrical' | 'general'
-- =============================================================================
INSERT INTO technician_profiles (employee_id, specialization, skills, certifications, experience_years, is_available, created_at)
VALUES
  ('eeee0001-0000-0000-0000-000000000011', 'ac',          '["AC Repair","HVAC Maintenance","Gas Refilling","Duct Cleaning"]', '["HVAC Certified","Gas Handling License"]', 5, true, now()),
  ('eeee0001-0000-0000-0000-000000000012', 'pest_control', '["Fumigation","Rodent Control","Termite Treatment"]',              '["Pest Control License","Chemical Handling Cert"]', 7, true, now()),
  ('eeee0001-0000-0000-0000-000000000013', 'general',      '["CCTV Operation","Ballistic Training","Access Control"]',         '["Armed License","Security Clearance Level 2"]', 10, true, now())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SECTION 17: LEAVE APPLICATIONS
-- employee_id → employees.id, approved_by → employees.id
-- =============================================================================
DO $$
DECLARE v_adm_emp uuid := '343771e0-4baf-443c-9a48-c102923f7419'::uuid;
BEGIN
  INSERT INTO leave_applications (employee_id, leave_type_id, start_date, end_date, total_days, reason, status, approved_by, created_at)
  SELECT
    t.emp_id::uuid,
    (SELECT id FROM leave_types WHERE leave_type_name ILIKE t.leave_type LIMIT 1),
    t.start_dt::date, t.end_dt::date, t.days, t.reason, t.status,
    CASE WHEN t.status IN ('approved','rejected') THEN v_adm_emp ELSE NULL END,
    now() - (t.days_ago || ' days')::interval
  FROM (VALUES
    ('11111111-1111-1111-1111-111111111111', 'Casual Leave',  '2026-03-20', '2026-03-21', 2, 'Personal work',                   'pending',  '5'),
    ('11111111-1111-1111-1111-111111111111', 'Sick Leave',    '2026-02-10', '2026-02-11', 2, 'Fever',                           'approved', '35'),
    ('eeee0001-0000-0000-0000-000000000001', 'Casual Leave',  '2026-03-25', '2026-03-25', 1, 'Personal errand',                 'pending',  '3'),
    ('eeee0001-0000-0000-0000-000000000003', 'Earned Leave',  '2026-04-07', '2026-04-11', 5, 'Family vacation',                 'approved', '7'),
    ('eeee0001-0000-0000-0000-000000000011', 'Sick Leave',    '2026-03-15', '2026-03-16', 2, 'Medical check-up',                'rejected', '2')
  ) AS t(emp_id, leave_type, start_dt, end_dt, days, reason, status, days_ago)
  WHERE NOT EXISTS (
    SELECT 1 FROM leave_applications la
    WHERE la.employee_id = t.emp_id::uuid AND la.start_date = t.start_dt::date
  );
END $$;

-- =============================================================================
-- SECTION 18: PAYROLL CYCLES
-- =============================================================================
INSERT INTO payroll_cycles (cycle_code, cycle_name, period_start, period_end, status, created_at)
VALUES
  ('PC-2026-02', 'February 2026 Payroll', '2026-02-01', '2026-02-28', 'disbursed', now() - interval '14 days'),
  ('PC-2026-03', 'March 2026 Payroll',    '2026-03-01', '2026-03-31', 'draft',     now())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SECTION 19: CANDIDATES (5 total, 1 pre-existing CAND-2026-0001)
-- =============================================================================
DO $$
DECLARE v_hod uuid := 'aaaa0001-0000-0000-0000-000000000003'::uuid;
BEGIN
  INSERT INTO candidates (candidate_code, applied_role_id, full_name, email, phone, status, applied_date, interviewer_id, created_at)
  SELECT
    t.code,
    (SELECT id FROM roles WHERE role_name = t.role LIMIT 1),
    t.full_nm, t.email, t.phone, t.status::text, t.app_dt::date,
    CASE WHEN t.status IN ('interviewing','background_check','offered') THEN v_hod ELSE NULL END,
    now()
  FROM (VALUES
    ('CAND-2026-002', 'security_guard',     'Ajay Patil',   'ajay.patil@gmail.com',   '+91-9011001100', 'screening',        '2026-03-01'),
    ('CAND-2026-003', 'security_guard',     'Sonal Mishra',  'sonal.m@gmail.com',      '+91-9011002200', 'interviewing',     '2026-02-25'),
    ('CAND-2026-004', 'ac_technician',      'Nitin Yadav',   'nitin.y@gmail.com',      '+91-9011003300', 'background_check', '2026-02-15'),
    ('CAND-2026-005', 'storekeeper',        'Kavita Nair',   'kavita.n@gmail.com',     '+91-9011004400', 'offered',          '2026-02-10')
  ) AS t(code, role, full_nm, email, phone, status, app_dt)
  WHERE NOT EXISTS (SELECT 1 FROM candidates WHERE candidate_code = t.code);
END $$;

-- =============================================================================
-- SECTION 20: BACKGROUND VERIFICATIONS
-- verified_by → employees.id
-- =============================================================================
DO $$
DECLARE v_adm_emp uuid := '343771e0-4baf-443c-9a48-c102923f7419'::uuid;
BEGIN
  INSERT INTO background_verifications (candidate_id, verification_type, verification_agency, initiated_date, completed_date, status, remarks, verified_by, created_at)
  SELECT
    (SELECT id FROM candidates WHERE candidate_code = t.code LIMIT 1),
    t.vtype, t.agency, t.init_dt::date, t.comp_dt::date, t.status, t.remarks, v_adm_emp, now()
  FROM (VALUES
    ('CAND-2026-003', 'Identity & Address',         'VerifyIndia Pvt Ltd',  '2026-03-01', NULL,         'pending',   'Aadhaar + Address verification initiated'),
    ('CAND-2026-004', 'Police Character Certificate','Local Police Station', '2026-02-15', '2026-03-01', 'completed', 'Certificate received. Clean record.')
  ) AS t(code, vtype, agency, init_dt, comp_dt, status, remarks)
  WHERE NOT EXISTS (
    SELECT 1 FROM background_verifications bv
    WHERE bv.candidate_id = (SELECT id FROM candidates WHERE candidate_code = t.code LIMIT 1)
  );
END $$;

-- =============================================================================
-- SECTION 21: BEHAVIOUR TICKETS
-- employee_id → employees.id, raised_by → users.id
-- Valid categories: sleeping_on_duty, rudeness, absence_from_post, grooming_uniform, unauthorized_entry
-- =============================================================================
INSERT INTO behaviour_tickets (employee_id, raised_by, category, severity, description, incident_date, incident_time, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'ba8661e4-e7d2-4dc7-adda-f05623b6b700', 'absence_from_post', 'low',  'Guard found absent from main gate post during evening inspection. Returned after 10 minutes.', '2026-03-10', '18:30:00', now()),
  ('eeee0001-0000-0000-0000-000000000009', 'aaaa0001-0000-0000-0000-000000000003', 'sleeping_on_duty',  'high', 'Supervisor found sleeping during night patrol round at 2 AM. Formally warned in writing.', '2026-03-05', '02:00:00', now())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SECTION 22: PEST CONTROL CHEMICALS (update existing + add near-expiry ones)
-- =============================================================================
UPDATE pest_control_chemicals SET batch_number = 'CHEM-BAT-2024-01', expiry_date = '2026-06-30', current_stock = 15, unit = 'Litre', reorder_level = 5
WHERE id = (SELECT id FROM pest_control_chemicals ORDER BY created_at LIMIT 1 OFFSET 0);

UPDATE pest_control_chemicals SET batch_number = 'CHEM-BAT-2024-02', expiry_date = '2026-04-15', current_stock = 8,  unit = 'Litre', reorder_level = 5
WHERE id = (SELECT id FROM pest_control_chemicals ORDER BY created_at LIMIT 1 OFFSET 1);

UPDATE pest_control_chemicals SET batch_number = 'CHEM-BAT-2024-03', expiry_date = '2026-03-31', current_stock = 3,  unit = 'Kg',    reorder_level = 5
WHERE id = (SELECT id FROM pest_control_chemicals ORDER BY created_at LIMIT 1 OFFSET 2);

-- New near-expiry chemicals for alert testing
INSERT INTO pest_control_chemicals (product_id, current_stock, unit, reorder_level, expiry_date, batch_number, is_active, last_restocked_at, created_at)
SELECT p.id, 20, 'Bottle', 10, '2026-03-25', 'CHEM-BAT-2025-01', true, now(), now()
FROM products p WHERE product_code = 'PRD-PEST-SPR'
AND NOT EXISTS (SELECT 1 FROM pest_control_chemicals WHERE batch_number = 'CHEM-BAT-2025-01');

INSERT INTO pest_control_chemicals (product_id, current_stock, unit, reorder_level, expiry_date, batch_number, is_active, last_restocked_at, created_at)
SELECT p.id, 2, 'Litre', 5, '2026-03-20', 'CHEM-BAT-2025-02', true, now(), now()
FROM products p WHERE product_code = 'CHEM-PC-001'
AND NOT EXISTS (SELECT 1 FROM pest_control_chemicals WHERE batch_number = 'CHEM-BAT-2025-02');

-- =============================================================================
-- SECTION 23: PRINTING AD SPACES + BOOKINGS
-- =============================================================================
INSERT INTO printing_ad_spaces (id, space_name, location_description, dimensions, base_rate_paise, status, created_by, created_at)
VALUES
  ('ad510001-0000-0000-0000-000000000001', 'Main Gate Banner',     'Banner above the main entrance gate, visible to all incoming traffic', '12ft x 4ft',   1500000, 'available', 'ba8661e4-e7d2-4dc7-adda-f05623b6b700', now()),
  ('ad510001-0000-0000-0000-000000000002', 'Lobby Digital Screen', 'Digital display screen in main lobby, high foot traffic',              '55 inch screen', 800000, 'booked',    'ba8661e4-e7d2-4dc7-adda-f05623b6b700', now()),
  ('ad510001-0000-0000-0000-000000000003', 'Notice Board Panel',   'Printed panel slot on main notice board near elevator bank',           '2ft x 3ft',     250000, 'available', 'ba8661e4-e7d2-4dc7-adda-f05623b6b700', now())
ON CONFLICT DO NOTHING;

INSERT INTO printing_ad_bookings (booking_number, ad_space_id, advertiser_name, start_date, end_date, agreed_rate_paise, status, approved_by, approved_at, notes, created_by, created_at)
VALUES
  ('ADV-BKG-2026-001', 'ad510001-0000-0000-0000-000000000002', 'QuickMart Superstore', '2026-03-01', '2026-04-30', 750000,  'confirmed', '343771e0-4baf-443c-9a48-c102923f7419', '2026-02-25 10:00:00+00', 'Monthly rotating ad for grocery store', 'ba8661e4-e7d2-4dc7-adda-f05623b6b700', now()),
  ('ADV-BKG-2026-002', 'ad510001-0000-0000-0000-000000000001', 'FitLife Gym',          '2026-04-01', '2026-06-30', 1400000, 'pending',   NULL,                                    NULL,                    'Seasonal fitness banner', 'ba8661e4-e7d2-4dc7-adda-f05623b6b700', now())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SECTION 24: HORTICULTURE TASKS
-- assigned_to → employees.id
-- =============================================================================
INSERT INTO horticulture_tasks (zone_id, task_type, frequency, assigned_to, priority, status, next_due_date, notes, created_at)
SELECT z.id, t.task_type, t.freq, 'eeee0001-0000-0000-0000-000000000010'::uuid, t.priority, t.status, t.next_due::date, t.notes, now()
FROM (VALUES
  ('Main Lawn',            'Watering',             'daily',   'high',   'pending',   '2026-03-18', 'Morning and evening watering. Use sprinkler system.'),
  ('Wing A Terrace',       'Fertilizer Application','monthly', 'medium', 'completed', '2026-04-01', 'Apply NPK fertilizer. Last done March 1.'),
  ('Clubhouse Perimeter',  'Pruning',              'weekly',  'low',    'pending',   '2026-03-20', 'Seasonal pruning of hedges and ornamental bushes.')
) AS t(zone_name, task_type, freq, priority, status, next_due, notes)
JOIN horticulture_zones z ON z.zone_name = t.zone_name
WHERE NOT EXISTS (
  SELECT 1 FROM horticulture_tasks ht WHERE ht.zone_id = z.id AND ht.task_type = t.task_type
);

-- =============================================================================
-- SECTION 25: RTV TICKETS (Return to Vendor)
-- supplier_id → suppliers.id, product_id → products.id (required)
-- receipt_id → material_receipts.id (nullable)
-- =============================================================================
DO $$
DECLARE
  v_sup_hk   uuid; v_sup_elec uuid;
  v_prod_hlm uuid; v_prod_bulb uuid;
  v_po4 uuid := 'd1983bab-6177-441f-9063-cf50f1916a25'::uuid;
  v_po5 uuid := 'f5c66281-afa2-4996-a749-06d41151844b'::uuid;
  v_sk  uuid := 'aaaa0001-0000-0000-0000-000000000008'::uuid;
BEGIN
  SELECT id INTO v_sup_hk   FROM suppliers WHERE supplier_code = 'SUP-HK-001'   LIMIT 1;
  SELECT id INTO v_sup_elec FROM suppliers WHERE supplier_code = 'SUP-ELEC-001' LIMIT 1;
  SELECT id INTO v_prod_hlm  FROM products WHERE product_code  = 'PRD-SAFE-HLM' LIMIT 1;
  SELECT id INTO v_prod_bulb FROM products WHERE product_code  = 'PRD-BULB-12W' LIMIT 1;

  INSERT INTO rtv_tickets (rtv_number, po_id, supplier_id, product_id, return_reason, quantity, unit_of_measurement, estimated_value, status, notes, raised_by, created_at)
  VALUES
    ('RTV-2026-001', v_po4, v_sup_hk,   v_prod_hlm,  'defective', 5,  'Nos', 3750000, 'pending',      'Helmets received with cracked shells. Supplier notified.',       v_sk, now()),
    ('RTV-2026-002', v_po5, v_sup_elec, v_prod_bulb, 'damaged',   10, 'Nos', 2500000, 'credit_issued', 'LED Bulbs in damaged packaging. Credit note CN-2026-012 issued.', v_sk, now() - interval '15 days')
  ON CONFLICT DO NOTHING;

  UPDATE rtv_tickets SET
    credit_note_number = 'CN-2026-012',
    credit_note_amount = 2400000,
    credit_issued_at   = now() - interval '10 days',
    dispatched_at      = now() - interval '13 days',
    accepted_at        = now() - interval '11 days'
  WHERE rtv_number = 'RTV-2026-002';
END $$;

-- =============================================================================
-- SECTION 26: ATTENDANCE LOGS (for new employees, Mar 11-17 2026)
-- =============================================================================
INSERT INTO attendance_logs (id, employee_id, log_date, check_in_time, check_out_time, total_hours, status, created_at)
SELECT gen_random_uuid(), emp_id::uuid, log_date::date,
  (log_date || ' 09:00:00+05:30')::timestamptz,
  (log_date || ' 18:00:00+05:30')::timestamptz,
  9.0, 'present', now()
FROM (VALUES
  ('eeee0001-0000-0000-0000-000000000001', '2026-03-11'),
  ('eeee0001-0000-0000-0000-000000000001', '2026-03-12'),
  ('eeee0001-0000-0000-0000-000000000001', '2026-03-13'),
  ('eeee0001-0000-0000-0000-000000000001', '2026-03-17'),
  ('eeee0001-0000-0000-0000-000000000003', '2026-03-11'),
  ('eeee0001-0000-0000-0000-000000000003', '2026-03-12'),
  ('eeee0001-0000-0000-0000-000000000003', '2026-03-13'),
  ('eeee0001-0000-0000-0000-000000000003', '2026-03-17'),
  ('eeee0001-0000-0000-0000-000000000008', '2026-03-11'),
  ('eeee0001-0000-0000-0000-000000000008', '2026-03-12'),
  ('eeee0001-0000-0000-0000-000000000008', '2026-03-14'),
  ('eeee0001-0000-0000-0000-000000000008', '2026-03-17'),
  ('eeee0001-0000-0000-0000-000000000009', '2026-03-11'),
  ('eeee0001-0000-0000-0000-000000000009', '2026-03-12'),
  ('eeee0001-0000-0000-0000-000000000009', '2026-03-13'),
  ('eeee0001-0000-0000-0000-000000000009', '2026-03-17'),
  ('eeee0001-0000-0000-0000-000000000011', '2026-03-11'),
  ('eeee0001-0000-0000-0000-000000000011', '2026-03-12'),
  ('eeee0001-0000-0000-0000-000000000011', '2026-03-13'),
  ('eeee0001-0000-0000-0000-000000000011', '2026-03-14'),
  ('eeee0001-0000-0000-0000-000000000012', '2026-03-11'),
  ('eeee0001-0000-0000-0000-000000000012', '2026-03-12'),
  ('eeee0001-0000-0000-0000-000000000012', '2026-03-14'),
  ('eeee0001-0000-0000-0000-000000000012', '2026-03-17')
) AS t(emp_id, log_date)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SECTION 27: FINANCIAL PERIODS
-- =============================================================================
INSERT INTO financial_periods (period_name, period_type, start_date, end_date, status, created_at)
VALUES
  ('February 2026', 'monthly', '2026-02-01', '2026-02-28', 'closed', now()),
  ('March 2026',    'monthly', '2026-03-01', '2026-03-31', 'open',   now())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DONE
-- =============================================================================
DO $$ BEGIN RAISE NOTICE 'seed_complete.sql applied successfully'; END $$;
