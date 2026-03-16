-- ========================================================================
-- GUARD ROLE SEED DATA - FacilityPro
-- Run this in the Supabase SQL Editor to seed all guard-related tables
-- ========================================================================

-- ========================================================================
-- STEP 0: Look up existing IDs we need to reference
-- ========================================================================

DO $$
DECLARE
  -- Auth & Identity
  v_guard_auth_id uuid;
  v_guard_employee_id uuid;
  v_guard_security_guard_id uuid;
  v_guard_user_id uuid;

  v_admin_auth_id uuid;

  -- Roles
  v_guard_role_id uuid;
  v_supervisor_role_id uuid;
  v_admin_role_id uuid;

  -- Location
  v_location_id uuid;

  -- Society / Building / Flat
  v_society_id uuid;
  v_building_id uuid;
  v_flat_101_id uuid;
  v_flat_102_id uuid;
  v_flat_201_id uuid;
  v_flat_301_id uuid;
  v_flat_302_id uuid;

  -- Residents
  v_resident_1_id uuid;
  v_resident_2_id uuid;
  v_resident_3_id uuid;
  v_resident_4_id uuid;
  v_resident_5_id uuid;

  -- Shifts
  v_day_shift_id uuid;
  v_night_shift_id uuid;

  -- Checklist
  v_checklist_id uuid;

  -- Designation
  v_guard_designation_id uuid;

  -- Misc
  v_today date := CURRENT_DATE;
  v_now timestamptz := NOW();

BEGIN
  -- ========================================================================
  -- STEP 1: Ensure roles exist
  -- ========================================================================
  SELECT id INTO v_guard_role_id FROM public.roles WHERE role_name = 'security_guard';
  SELECT id INTO v_supervisor_role_id FROM public.roles WHERE role_name = 'security_supervisor';
  SELECT id INTO v_admin_role_id FROM public.roles WHERE role_name = 'admin';

  IF v_guard_role_id IS NULL THEN
    RAISE EXCEPTION 'Role security_guard not found. Please seed roles first.';
  END IF;

  -- ========================================================================
  -- STEP 2: Ensure guard designation exists
  -- ========================================================================
  SELECT id INTO v_guard_designation_id FROM public.designations WHERE designation_code = 'SG';
  
  IF v_guard_designation_id IS NULL THEN
    INSERT INTO public.designations (designation_code, designation_name, department, description, is_active)
    VALUES ('SG', 'Security Guard', 'Security', 'On-site security guard for premises protection', true)
    RETURNING id INTO v_guard_designation_id;
  END IF;

  -- ========================================================================
  -- STEP 3: Ensure company location (GATE-01) exists with proper geo-fence
  -- ========================================================================
  SELECT id INTO v_location_id FROM public.company_locations WHERE location_code = 'GATE-01';
  
  IF v_location_id IS NULL THEN
    INSERT INTO public.company_locations (
      location_code, location_name, location_type,
      latitude, longitude, geo_fence_radius,
      address, is_active
    ) VALUES (
      'GATE-01', 'Main Gate', 'gate',
      19.0760, 72.8777, 100, -- Mumbai coordinates, 100m radius
      'Main Entrance Gate, Green Valley Society', true
    )
    RETURNING id INTO v_location_id;
  ELSE
    -- Ensure coordinates and radius are set
    UPDATE public.company_locations 
    SET latitude = COALESCE(latitude, 19.0760),
        longitude = COALESCE(longitude, 72.8777),
        geo_fence_radius = COALESCE(geo_fence_radius, 100)
    WHERE id = v_location_id;
  END IF;

  -- ========================================================================
  -- STEP 4: Ensure society, buildings, flats exist
  -- ========================================================================
  SELECT id INTO v_society_id FROM public.societies WHERE society_code = 'GVS-001';
  
  IF v_society_id IS NULL THEN
    INSERT INTO public.societies (
      society_code, society_name, address, city, state, pincode,
      total_buildings, total_flats, contact_person, contact_phone, contact_email, is_active
    ) VALUES (
      'GVS-001', 'Green Valley Society', '123 MG Road, Andheri West',
      'Mumbai', 'Maharashtra', '400058', 3, 30,
      'Rajesh Sharma', '+91 98765 43210', 'manager@greenvalley.com', true
    )
    RETURNING id INTO v_society_id;
  END IF;

  -- Building
  SELECT id INTO v_building_id FROM public.buildings WHERE building_code = 'A-BLOCK';
  
  IF v_building_id IS NULL THEN
    INSERT INTO public.buildings (building_code, building_name, society_id, total_floors, total_flats, is_active)
    VALUES ('A-BLOCK', 'A Block - Orchid Tower', v_society_id, 10, 30, true)
    RETURNING id INTO v_building_id;
  ELSE
    -- Link to our society if not already
    UPDATE public.buildings SET society_id = v_society_id WHERE id = v_building_id AND society_id IS NULL;
  END IF;

  -- Flats (5 flats for visitor scenarios)
  SELECT id INTO v_flat_101_id FROM public.flats WHERE flat_number = '101' AND building_id = v_building_id;
  IF v_flat_101_id IS NULL THEN
    INSERT INTO public.flats (flat_number, building_id, floor_number, flat_type, area_sqft, ownership_type, is_occupied, is_active)
    VALUES ('101', v_building_id, 1, '2BHK', 950, 'owned', true, true)
    RETURNING id INTO v_flat_101_id;
  END IF;

  SELECT id INTO v_flat_102_id FROM public.flats WHERE flat_number = '102' AND building_id = v_building_id;
  IF v_flat_102_id IS NULL THEN
    INSERT INTO public.flats (flat_number, building_id, floor_number, flat_type, area_sqft, ownership_type, is_occupied, is_active)
    VALUES ('102', v_building_id, 1, '3BHK', 1200, 'owned', true, true)
    RETURNING id INTO v_flat_102_id;
  END IF;

  SELECT id INTO v_flat_201_id FROM public.flats WHERE flat_number = '201' AND building_id = v_building_id;
  IF v_flat_201_id IS NULL THEN
    INSERT INTO public.flats (flat_number, building_id, floor_number, flat_type, area_sqft, ownership_type, is_occupied, is_active)
    VALUES ('201', v_building_id, 2, '2BHK', 950, 'rented', true, true)
    RETURNING id INTO v_flat_201_id;
  END IF;

  SELECT id INTO v_flat_301_id FROM public.flats WHERE flat_number = '301' AND building_id = v_building_id;
  IF v_flat_301_id IS NULL THEN
    INSERT INTO public.flats (flat_number, building_id, floor_number, flat_type, area_sqft, ownership_type, is_occupied, is_active)
    VALUES ('301', v_building_id, 3, '3BHK', 1200, 'owned', true, true)
    RETURNING id INTO v_flat_301_id;
  END IF;

  SELECT id INTO v_flat_302_id FROM public.flats WHERE flat_number = '302' AND building_id = v_building_id;
  IF v_flat_302_id IS NULL THEN
    INSERT INTO public.flats (flat_number, building_id, floor_number, flat_type, area_sqft, ownership_type, is_occupied, is_active)
    VALUES ('302', v_building_id, 3, '2BHK', 950, 'rented', true, true)
    RETURNING id INTO v_flat_302_id;
  END IF;

  -- ========================================================================
  -- STEP 5: Ensure residents exist
  -- ========================================================================
  SELECT id INTO v_resident_1_id FROM public.residents WHERE resident_code = 'RES-001';
  IF v_resident_1_id IS NULL THEN
    INSERT INTO public.residents (resident_code, flat_id, full_name, relation, phone, email, is_primary_contact, move_in_date, is_active)
    VALUES ('RES-001', v_flat_101_id, 'Priya Mehta', 'Owner', '+91 99887 76655', 'priya.mehta@email.com', true, '2024-01-15', true)
    RETURNING id INTO v_resident_1_id;
  END IF;

  SELECT id INTO v_resident_2_id FROM public.residents WHERE resident_code = 'RES-002';
  IF v_resident_2_id IS NULL THEN
    INSERT INTO public.residents (resident_code, flat_id, full_name, relation, phone, email, is_primary_contact, move_in_date, is_active)
    VALUES ('RES-002', v_flat_102_id, 'Amit Patel', 'Owner', '+91 98765 12345', 'amit.patel@email.com', true, '2023-06-01', true)
    RETURNING id INTO v_resident_2_id;
  END IF;

  SELECT id INTO v_resident_3_id FROM public.residents WHERE resident_code = 'RES-003';
  IF v_resident_3_id IS NULL THEN
    INSERT INTO public.residents (resident_code, flat_id, full_name, relation, phone, email, is_primary_contact, move_in_date, is_active)
    VALUES ('RES-003', v_flat_201_id, 'Sunita Desai', 'Tenant', '+91 97654 32100', 'sunita.desai@email.com', true, '2025-02-01', true)
    RETURNING id INTO v_resident_3_id;
  END IF;

  SELECT id INTO v_resident_4_id FROM public.residents WHERE resident_code = 'RES-004';
  IF v_resident_4_id IS NULL THEN
    INSERT INTO public.residents (resident_code, flat_id, full_name, relation, phone, email, is_primary_contact, move_in_date, is_active)
    VALUES ('RES-004', v_flat_301_id, 'Vikram Singh', 'Owner', '+91 91234 56789', 'vikram.singh@email.com', true, '2022-11-10', true)
    RETURNING id INTO v_resident_4_id;
  END IF;

  SELECT id INTO v_resident_5_id FROM public.residents WHERE resident_code = 'RES-005';
  IF v_resident_5_id IS NULL THEN
    INSERT INTO public.residents (resident_code, flat_id, full_name, relation, phone, email, is_primary_contact, move_in_date, is_active)
    VALUES ('RES-005', v_flat_302_id, 'Neha Kapoor', 'Owner', '+91 98120 45678', 'neha.kapoor@email.com', true, '2024-08-20', true)
    RETURNING id INTO v_resident_5_id;
  END IF;

  -- ========================================================================
  -- STEP 6: Ensure shifts exist (Day + Night)
  -- ========================================================================
  SELECT id INTO v_day_shift_id FROM public.shifts WHERE shift_code = 'DAY-01';
  IF v_day_shift_id IS NULL THEN
    INSERT INTO public.shifts (shift_code, shift_name, start_time, end_time, duration_hours, is_night_shift, break_duration_minutes, grace_time_minutes, is_active)
    VALUES ('DAY-01', 'Day Shift', '08:00:00', '20:00:00', 12, false, 60, 15, true)
    RETURNING id INTO v_day_shift_id;
  END IF;

  SELECT id INTO v_night_shift_id FROM public.shifts WHERE shift_code = 'NIGHT-01';
  IF v_night_shift_id IS NULL THEN
    INSERT INTO public.shifts (shift_code, shift_name, start_time, end_time, duration_hours, is_night_shift, break_duration_minutes, grace_time_minutes, is_active)
    VALUES ('NIGHT-01', 'Night Shift', '20:00:00', '08:00:00', 12, true, 60, 15, true)
    RETURNING id INTO v_night_shift_id;
  END IF;

  -- ========================================================================
  -- STEP 7: Ensure Security Checklist exists
  -- ========================================================================
  SELECT id INTO v_checklist_id FROM public.daily_checklists WHERE department = 'security' AND is_active = true;
  
  IF v_checklist_id IS NULL THEN
    INSERT INTO public.daily_checklists (
      checklist_code, checklist_name, department, description,
      questions, frequency, is_active
    ) VALUES (
      'SEC-CHK-001', 'Guard Daily Security Checklist', 'security',
      'Daily security checklist for on-duty guards. Must be completed every shift.',
      '[
        {"id": "task-1", "question": "Main gate lock and latch inspection completed", "required": true},
        {"id": "task-2", "question": "CCTV cameras checked and operational", "required": true},
        {"id": "task-3", "question": "Fire extinguishers checked (pressure, seal, expiry)", "required": true},
        {"id": "task-4", "question": "Emergency exit paths clear and unobstructed", "required": false},
        {"id": "task-5", "question": "Visitor log book updated and organized", "required": false},
        {"id": "task-6", "question": "Parking area sweep completed", "required": true},
        {"id": "task-7", "question": "Perimeter fence integrity check done", "required": false},
        {"id": "task-8", "question": "Night lights and security lamps working", "required": false},
        {"id": "task-9", "question": "Intercom system tested for all buildings", "required": false},
        {"id": "task-10", "question": "Water pump room inspection completed", "required": true}
      ]'::jsonb,
      'daily', true
    )
    RETURNING id INTO v_checklist_id;
  END IF;

  -- ========================================================================
  -- STEP 8: Find or create the guard employee + security_guards + users
  -- We need to detect if we're reseeding, so check for existing guard employee
  -- ========================================================================

  -- Try to find existing guard employee by employee_code
  SELECT id INTO v_guard_employee_id FROM public.employees WHERE employee_code = 'EMP-GUARD-01';

  IF v_guard_employee_id IS NULL THEN
    -- Need to check if there's a guard auth user already
    -- We'll look for an existing user with the guard role
    SELECT u.id, u.employee_id INTO v_guard_auth_id, v_guard_employee_id
    FROM public.users u
    WHERE u.role_id = v_guard_role_id
    LIMIT 1;

    IF v_guard_employee_id IS NULL THEN
      -- Create a new employee for the guard
      INSERT INTO public.employees (
        employee_code, first_name, last_name, email, phone,
        date_of_birth, date_of_joining, designation_id, department,
        is_active, address, city, state, pincode,
        emergency_contact_name, emergency_contact_phone
      ) VALUES (
        'EMP-GUARD-01', 'Rajendra', 'Kumar', 'guard@facilitypro.com', '+91 99887 11223',
        '1995-03-15', '2025-01-10', v_guard_designation_id, 'Security',
        true, '45 Worker Colony, Goregaon',
        'Mumbai', 'Maharashtra', '400063',
        'Suresh Kumar', '+91 98765 43210'
      )
      RETURNING id INTO v_guard_employee_id;
    END IF;
  END IF;

  -- Ensure security_guards record exists
  SELECT id INTO v_guard_security_guard_id FROM public.security_guards WHERE employee_id = v_guard_employee_id;
  
  IF v_guard_security_guard_id IS NULL THEN
    INSERT INTO public.security_guards (
      employee_id, guard_code, grade, is_armed,
      license_number, license_expiry,
      assigned_location_id, shift_timing, is_active
    ) VALUES (
      v_guard_employee_id, 'GRD-001', 'A', false,
      'MH/SEC/2025/00123', '2027-12-31',
      v_location_id, '08:00 - 20:00', true
    )
    RETURNING id INTO v_guard_security_guard_id;
  END IF;

  -- ========================================================================
  -- STEP 9: Ensure guard has a shift assignment (for today)
  -- ========================================================================
  IF NOT EXISTS (
    SELECT 1 FROM public.employee_shift_assignments
    WHERE employee_id = v_guard_employee_id
      AND is_active = true
      AND assigned_from <= v_today
      AND (assigned_to IS NULL OR assigned_to >= v_today)
  ) THEN
    INSERT INTO public.employee_shift_assignments (
      employee_id, shift_id, assigned_from, assigned_to, is_active
    ) VALUES (
      v_guard_employee_id, v_day_shift_id, v_today - INTERVAL '30 days', NULL, true
    );
  END IF;

  -- ========================================================================
  -- STEP 10: Seed VISITORS data
  -- 10a: Pre-approved expected visitors (entry_time = NULL, approved_by_resident = TRUE)
  -- 10b: Active visitors (inside premises, entry_time set, exit_time NULL)
  -- 10c: Completed visitors (both entry and exit times set)
  -- ========================================================================

  -- Clean old seed visitors to avoid duplicates on re-run
  DELETE FROM public.visitors WHERE visitor_pass_number LIKE 'SEED-%';

  -- 10a: Pre-approved expected visitors (3 visitors waiting at gate)
  INSERT INTO public.visitors (
    visitor_name, visitor_type, phone, vehicle_number,
    flat_id, resident_id, purpose,
    entry_time, exit_time,
    entry_guard_id, entry_location_id,
    approved_by_resident, visitor_pass_number,
    is_frequent_visitor
  ) VALUES
  -- Expected Visitor 1: Delivery person for Flat 101
  (
    'Rajan Delivery', 'delivery', '+91 98765 00001', NULL,
    v_flat_101_id, v_resident_1_id, 'Amazon Package Delivery',
    NULL, NULL,
    NULL, NULL,
    true, 'SEED-EXP-001',
    false
  ),
  -- Expected Visitor 2: Family member for Flat 201
  (
    'Meera Desai', 'guest', '+91 98765 00002', 'MH-04-AB-1234',
    v_flat_201_id, v_resident_3_id, 'Family Visit',
    NULL, NULL,
    NULL, NULL,
    true, 'SEED-EXP-002',
    true
  ),
  -- Expected Visitor 3: Plumber for Flat 301
  (
    'Santosh Plumber', 'service', '+91 98765 00003', NULL,
    v_flat_301_id, v_resident_4_id, 'Kitchen tap repair',
    NULL, NULL,
    NULL, NULL,
    true, 'SEED-EXP-003',
    false
  );

  -- 10b: Active visitors (currently inside, 2 visitors)
  INSERT INTO public.visitors (
    visitor_name, visitor_type, phone, vehicle_number,
    flat_id, resident_id, purpose,
    entry_time, exit_time,
    entry_guard_id, entry_location_id,
    approved_by_resident, visitor_pass_number,
    is_frequent_visitor
  ) VALUES
  -- Active Visitor 1: Guest in Flat 102
  (
    'Deepak Shah', 'guest', '+91 98765 00004', 'MH-01-CD-5678',
    v_flat_102_id, v_resident_2_id, 'Birthday party attendance',
    v_now - INTERVAL '2 hours', NULL,
    v_guard_security_guard_id, v_location_id,
    true, 'SEED-ACT-001',
    false
  ),
  -- Active Visitor 2: Electrician in Flat 302
  (
    'Manoj Kumar', 'service', '+91 98765 00005', NULL,
    v_flat_302_id, v_resident_5_id, 'Electrical wiring repair',
    v_now - INTERVAL '45 minutes', NULL,
    v_guard_security_guard_id, v_location_id,
    true, 'SEED-ACT-002',
    false
  );

  -- 10c: Completed visitors today (already left, 3 visitors)
  INSERT INTO public.visitors (
    visitor_name, visitor_type, phone, vehicle_number,
    flat_id, resident_id, purpose,
    entry_time, exit_time,
    entry_guard_id, exit_guard_id, entry_location_id,
    approved_by_resident, visitor_pass_number,
    is_frequent_visitor
  ) VALUES
  (
    'Courier Express', 'delivery', '+91 98765 00006', NULL,
    v_flat_101_id, v_resident_1_id, 'Flipkart parcel',
    v_now - INTERVAL '6 hours', v_now - INTERVAL '5 hours 50 minutes',
    v_guard_security_guard_id, v_guard_security_guard_id, v_location_id,
    true, 'SEED-DONE-001',
    false
  ),
  (
    'Ramesh Milk Man', 'service', '+91 98765 00007', NULL,
    NULL, NULL, 'Daily milk delivery',
    v_now - INTERVAL '8 hours', v_now - INTERVAL '7 hours 30 minutes',
    v_guard_security_guard_id, v_guard_security_guard_id, v_location_id,
    false, 'SEED-DONE-002',
    true
  ),
  (
    'Priyanka Verma', 'guest', '+91 98765 00008', 'MH-02-EF-9012',
    v_flat_201_id, v_resident_3_id, 'Morning chai visit',
    v_now - INTERVAL '4 hours', v_now - INTERVAL '2 hours 30 minutes',
    v_guard_security_guard_id, v_guard_security_guard_id, v_location_id,
    true, 'SEED-DONE-003',
    true
  );

  -- ========================================================================
  -- STEP 11: Seed PANIC ALERTS history (resolved + unresolved)
  -- ========================================================================
  DELETE FROM public.panic_alerts WHERE description LIKE '[SEED]%';

  -- Get admin user ID for resolved_by
  SELECT id INTO v_admin_auth_id FROM public.users WHERE role_id = v_admin_role_id LIMIT 1;

  -- Resolved panic from yesterday
  INSERT INTO public.panic_alerts (
    guard_id, alert_type, location_id,
    latitude, longitude,
    alert_time, description,
    is_resolved, resolved_at, resolved_by, resolution_notes
  ) VALUES (
    v_guard_security_guard_id, 'panic', v_location_id,
    19.0762, 72.8779,
    v_now - INTERVAL '1 day 2 hours',
    '[SEED] Suspicious person spotted near parking area B',
    true,
    v_now - INTERVAL '1 day 1 hour 45 minutes',
    v_admin_auth_id,
    'Police patrol dispatched. Person was a lost food delivery agent. Situation resolved.'
  );

  -- Resolved inactivity alert from today
  INSERT INTO public.panic_alerts (
    guard_id, alert_type, location_id,
    latitude, longitude,
    alert_time, description,
    is_resolved, resolved_at, resolved_by, resolution_notes
  ) VALUES (
    v_guard_security_guard_id, 'inactivity', v_location_id,
    19.0758, 72.8775,
    v_now - INTERVAL '3 hours',
    '[SEED] Guard inactivity detected - no movement for 15 minutes',
    true,
    v_now - INTERVAL '2 hours 50 minutes',
    v_admin_auth_id,
    'Guard was on authorized washroom break. Activity resumed.'
  );

  -- Resolved geo-fence breach from 2 days ago
  INSERT INTO public.panic_alerts (
    guard_id, alert_type, location_id,
    latitude, longitude,
    alert_time, description,
    is_resolved, resolved_at, resolved_by, resolution_notes
  ) VALUES (
    v_guard_security_guard_id, 'geo_fence_breach', v_location_id,
    19.0800, 72.8810,
    v_now - INTERVAL '2 days 5 hours',
    '[SEED] Persistent geo-fence breach. Current distance: 350m.',
    true,
    v_now - INTERVAL '2 days 4 hours 30 minutes',
    v_admin_auth_id,
    'Guard was sent to nearby hardware shop to purchase replacement locks. Pre-approved by supervisor.'
  );

  -- ========================================================================
  -- STEP 12: Seed GUARD PATROL LOGS
  -- ========================================================================
  DELETE FROM public.guard_patrol_logs WHERE anomalies_found LIKE '[SEED]%' OR anomalies_found IS NULL;

  -- Patrol from yesterday (completed)
  INSERT INTO public.guard_patrol_logs (
    guard_id, patrol_start_time, patrol_end_time,
    patrol_route, checkpoints_verified, total_checkpoints,
    anomalies_found
  ) VALUES (
    v_guard_security_guard_id,
    v_now - INTERVAL '1 day 4 hours',
    v_now - INTERVAL '1 day 3 hours 15 minutes',
    jsonb_build_array(
      jsonb_build_object('checkpoint', 'Main Gate',    'verified_at', to_char(v_now - INTERVAL '1 day 4 hours', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),    'status', 'ok'),
      jsonb_build_object('checkpoint', 'Parking B',    'verified_at', to_char(v_now - INTERVAL '1 day 3 hours 45 min', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'status', 'ok'),
      jsonb_build_object('checkpoint', 'Garden Area',  'verified_at', to_char(v_now - INTERVAL '1 day 3 hours 30 min', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'status', 'issue'),
      jsonb_build_object('checkpoint', 'Pool Area',    'verified_at', to_char(v_now - INTERVAL '1 day 3 hours 20 min', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'status', 'ok'),
      jsonb_build_object('checkpoint', 'Back Gate',    'verified_at', to_char(v_now - INTERVAL '1 day 3 hours 15 min', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'status', 'ok')
    ),
    5, 5,
    '[SEED] Garden area: Broken bench near fountain reported. Maintenance ticket raised.'
  );

  -- Patrol from today morning (completed)
  INSERT INTO public.guard_patrol_logs (
    guard_id, patrol_start_time, patrol_end_time,
    patrol_route, checkpoints_verified, total_checkpoints,
    anomalies_found
  ) VALUES (
    v_guard_security_guard_id,
    v_now - INTERVAL '6 hours',
    v_now - INTERVAL '5 hours 20 minutes',
    jsonb_build_array(
      jsonb_build_object('checkpoint', 'Main Gate',    'verified_at', to_char(v_now - INTERVAL '6 hours', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),          'status', 'ok'),
      jsonb_build_object('checkpoint', 'Parking B',    'verified_at', to_char(v_now - INTERVAL '5 hours 50 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'status', 'ok'),
      jsonb_build_object('checkpoint', 'Garden Area',  'verified_at', to_char(v_now - INTERVAL '5 hours 40 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'status', 'ok'),
      jsonb_build_object('checkpoint', 'Pool Area',    'verified_at', to_char(v_now - INTERVAL '5 hours 30 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'status', 'ok'),
      jsonb_build_object('checkpoint', 'Back Gate',    'verified_at', to_char(v_now - INTERVAL '5 hours 20 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'status', 'ok')
    ),
    5, 5,
    '[SEED] All checkpoints clear. No anomalies detected.'
  );

  -- ========================================================================
  -- STEP 13: Seed EMERGENCY CONTACTS
  -- ========================================================================
  -- Upsert to avoid duplicates
  INSERT INTO public.emergency_contacts (contact_name, contact_type, phone_number, priority, is_active, society_id, description)
  VALUES 
    ('Police Control Room', 'police', '100', 1, true, v_society_id, 'Local police emergency number'),
    ('Fire Brigade', 'fire', '101', 2, true, v_society_id, 'Mumbai Fire Department'),
    ('Ambulance (MEMS)', 'ambulance', '108', 3, true, v_society_id, 'Maharashtra Emergency Medical Service'),
    ('Society Manager - Rajesh', 'management', '+91 98765 43210', 4, true, v_society_id, 'Green Valley Society Manager, available 24/7'),
    ('Security Supervisor - Dinesh', 'security', '+91 99001 12233', 5, true, v_society_id, 'Head of security operations')
  ON CONFLICT DO NOTHING;

  -- ========================================================================
  -- STEP 14: Seed NOTIFICATIONS for the guard user
  -- ========================================================================
  -- Get the guard's auth user ID from users table
  SELECT id INTO v_guard_user_id FROM public.users WHERE employee_id = v_guard_employee_id LIMIT 1;

  IF v_guard_user_id IS NOT NULL THEN
    DELETE FROM public.notifications WHERE user_id = v_guard_user_id AND title LIKE '[Seed]%';

    INSERT INTO public.notifications (user_id, notification_type, title, message, reference_type, is_read, priority, created_at)
    VALUES
    (v_guard_user_id, 'shift_reminder', '[Seed] Shift Starting Soon', 'Your Day Shift starts in 15 minutes at 08:00 AM. Please report to Main Gate.', 'shift', false, 'high', v_now - INTERVAL '8 hours'),
    (v_guard_user_id, 'visitor_alert', '[Seed] Visitor Pre-Approved', 'Rajan Delivery has been pre-approved by Priya Mehta (Flat 101) for Amazon Package Delivery.', 'visitor', false, 'normal', v_now - INTERVAL '2 hours'),
    (v_guard_user_id, 'checklist_reminder', '[Seed] Checklist Pending', 'You have 6 pending items on your Daily Security Checklist. Complete before shift ends.', 'checklist', false, 'normal', v_now - INTERVAL '1 hour'),
    (v_guard_user_id, 'alert_resolved', '[Seed] Alert Resolved', 'Your panic alert about suspicious person near Parking B has been resolved by the supervisor.', 'panic_alert', true, 'high', v_now - INTERVAL '1 day'),
    (v_guard_user_id, 'attendance', '[Seed] Clock-In Confirmed', 'You have been clocked in at Main Gate at 08:05 AM. Your shift ends at 08:00 PM.', 'attendance', true, 'normal', v_now - INTERVAL '7 hours 55 minutes');
  END IF;

  -- ========================================================================
  -- STEP 15: Seed ATTENDANCE history (last 7 days for the guard)
  -- ========================================================================
  -- Don't touch today's attendance (guard will clock in via the app)
  -- Seed last 7 days of history
  DELETE FROM public.attendance_logs 
  WHERE employee_id = v_guard_employee_id 
    AND log_date < v_today 
    AND log_date >= v_today - 7;

  -- Day 1 (yesterday) - Full shift
  INSERT INTO public.attendance_logs (
    employee_id, log_date, check_in_time, check_out_time,
    check_in_location_id, check_out_location_id,
    total_hours, status,
    check_in_latitude, check_in_longitude,
    check_out_latitude, check_out_longitude
  ) VALUES (
    v_guard_employee_id, v_today - 1,
    (v_today - 1 + TIME '08:05:00')::timestamptz,
    (v_today - 1 + TIME '20:10:00')::timestamptz,
    v_location_id, v_location_id,
    12.08, 'present',
    18.5194, 73.8519, 18.5195, 73.8520
  );

  -- Day 2 - Full shift  
  INSERT INTO public.attendance_logs (
    employee_id, log_date, check_in_time, check_out_time,
    check_in_location_id, check_out_location_id,
    total_hours, status,
    check_in_latitude, check_in_longitude,
    check_out_latitude, check_out_longitude
  ) VALUES (
    v_guard_employee_id, v_today - 2,
    (v_today - 2 + TIME '07:58:00')::timestamptz,
    (v_today - 2 + TIME '20:05:00')::timestamptz,
    v_location_id, v_location_id,
    12.12, 'present',
    18.5194, 73.8519, 18.5195, 73.8520
  );

  -- Day 3 - Late arrival
  INSERT INTO public.attendance_logs (
    employee_id, log_date, check_in_time, check_out_time,
    check_in_location_id, check_out_location_id,
    total_hours, status,
    check_in_latitude, check_in_longitude,
    check_out_latitude, check_out_longitude
  ) VALUES (
    v_guard_employee_id, v_today - 3,
    (v_today - 3 + TIME '08:25:00')::timestamptz,
    (v_today - 3 + TIME '20:00:00')::timestamptz,
    v_location_id, v_location_id,
    11.58, 'late',
    18.5194, 73.8519, 18.5195, 73.8520
  );

  -- Day 4 - Full shift
  INSERT INTO public.attendance_logs (
    employee_id, log_date, check_in_time, check_out_time,
    check_in_location_id, check_out_location_id,
    total_hours, status,
    check_in_latitude, check_in_longitude,
    check_out_latitude, check_out_longitude
  ) VALUES (
    v_guard_employee_id, v_today - 4,
    (v_today - 4 + TIME '08:02:00')::timestamptz,
    (v_today - 4 + TIME '20:15:00')::timestamptz,
    v_location_id, v_location_id,
    12.22, 'present',
    18.5194, 73.8519, 18.5195, 73.8520
  );

  -- Day 5 - Absent (leave)
  -- No attendance record

  -- Day 6 - Full shift
  INSERT INTO public.attendance_logs (
    employee_id, log_date, check_in_time, check_out_time,
    check_in_location_id, check_out_location_id,
    total_hours, status,
    check_in_latitude, check_in_longitude,
    check_out_latitude, check_out_longitude
  ) VALUES (
    v_guard_employee_id, v_today - 6,
    (v_today - 6 + TIME '08:10:00')::timestamptz,
    (v_today - 6 + TIME '20:05:00')::timestamptz,
    v_location_id, v_location_id,
    11.92, 'present',
    18.5194, 73.8519, 18.5195, 73.8520
  );

  -- Day 7 - Full shift
  INSERT INTO public.attendance_logs (
    employee_id, log_date, check_in_time, check_out_time,
    check_in_location_id, check_out_location_id,
    total_hours, status,
    check_in_latitude, check_in_longitude,
    check_out_latitude, check_out_longitude
  ) VALUES (
    v_guard_employee_id, v_today - 7,
    (v_today - 7 + TIME '08:00:00')::timestamptz,
    (v_today - 7 + TIME '20:00:00')::timestamptz,
    v_location_id, v_location_id,
    12.00, 'present',
    18.5194, 73.8519, 18.5195, 73.8520
  );

  -- ========================================================================
  -- STEP 16: Seed a LEAVE APPLICATION for the guard (Day 5 = absent)
  -- ========================================================================
  IF NOT EXISTS (
    SELECT 1 FROM public.leave_applications
    WHERE employee_id = v_guard_employee_id
      AND from_date = v_today - 5
  ) THEN
    INSERT INTO public.leave_applications (
      employee_id, leave_type_id, from_date, to_date,
      number_of_days, reason, status
    )
    SELECT 
      v_guard_employee_id,
      lt.id,
      v_today - 5,
      v_today - 5,
      1,
      'Personal family function',
      'approved'
    FROM public.leave_types lt
    WHERE lt.leave_type = 'casual_leave'
    LIMIT 1;
  END IF;

  -- ========================================================================
  -- STEP 17: Final summary
  -- ========================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'GUARD SEED DATA COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Guard Employee ID: %', v_guard_employee_id;
  RAISE NOTICE 'Guard Security ID: %', v_guard_security_guard_id;
  RAISE NOTICE 'Location (GATE-01): %', v_location_id;
  RAISE NOTICE 'Day Shift ID: %', v_day_shift_id;
  RAISE NOTICE 'Checklist ID: %', v_checklist_id;
  RAISE NOTICE 'Society ID: %', v_society_id;
  RAISE NOTICE 'Building ID: %', v_building_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Seeded:';
  RAISE NOTICE '  - 5 Flats with Residents';
  RAISE NOTICE '  - 3 Expected Visitors (pre-approved)';
  RAISE NOTICE '  - 2 Active Visitors (inside premises)';
  RAISE NOTICE '  - 3 Completed Visitors (left today)';
  RAISE NOTICE '  - 3 Panic Alerts (resolved)';
  RAISE NOTICE '  - 2 Patrol Logs';
  RAISE NOTICE '  - 5 Emergency Contacts';
  RAISE NOTICE '  - 5 Notifications';
  RAISE NOTICE '  - 7 Days Attendance History';
  RAISE NOTICE '  - 1 Leave Application';
  RAISE NOTICE '  - 10-item Security Checklist';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: The guard user must exist in auth.users and be linked in';
  RAISE NOTICE '      public.users with employee_id pointing to this employee.';
  RAISE NOTICE '      Login with the guard credentials to test the dashboard.';

END $$;
