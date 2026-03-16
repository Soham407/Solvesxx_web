-- PHASE A: SEED LEAVE APPLICATIONS
-- This script populates test data for the leave management system
-- Run this after schema_phaseA_final_patch.sql

-- Prerequisites:
-- 1. employees table must have data
-- 2. leave_types table must have data

DO $$
DECLARE
    v_employee_1 UUID;
    v_employee_2 UUID;
    v_employee_3 UUID;
    v_sick_leave UUID;
    v_casual_leave UUID;
    v_paid_leave UUID;
BEGIN
    -- Get employee IDs (using existing employees from seed data)
    SELECT id INTO v_employee_1 FROM employees WHERE first_name = 'Suresh' AND last_name = 'Patil' LIMIT 1;
    SELECT id INTO v_employee_2 FROM employees WHERE first_name = 'System' AND last_name = 'Admin' LIMIT 1;
    
    -- If we don't have enough employees, create test employees
    IF v_employee_1 IS NULL THEN
        INSERT INTO employees (first_name, last_name, email, phone, designation, department, status)
        VALUES ('Suresh', 'Patil', 'suresh.patil@example.com', '9876543210', 'Security Guard', 'Security', 'active')
        RETURNING id INTO v_employee_1;
    END IF;
    
    IF v_employee_2 IS NULL THEN
        INSERT INTO employees (first_name, last_name, email, phone, designation, department, status)
        VALUES ('Rajesh', 'Kumar', 'rajesh.kumar@example.com', '9876543211', 'Supervisor', 'Security', 'active')
        RETURNING id INTO v_employee_2;
    END IF;
    
    -- Create a third employee for testing
    INSERT INTO employees (first_name, last_name, email, phone, designation, department, status)
    VALUES ('Priya', 'Sharma', 'priya.sharma@example.com', '9876543212', 'HR Manager', 'HRMS', 'active')
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO v_employee_3;
    
    IF v_employee_3 IS NULL THEN
        SELECT id INTO v_employee_3 FROM employees WHERE email = 'priya.sharma@example.com';
    END IF;

    -- Get leave type IDs
    SELECT id INTO v_sick_leave FROM leave_types WHERE leave_type = 'sick_leave' LIMIT 1;
    SELECT id INTO v_casual_leave FROM leave_types WHERE leave_type = 'casual_leave' LIMIT 1;
    SELECT id INTO v_paid_leave FROM leave_types WHERE leave_type = 'paid_leave' LIMIT 1;

    -- If leave types don't exist, create them
    IF v_sick_leave IS NULL THEN
        INSERT INTO leave_types (leave_name, leave_type, max_days_per_year, carry_forward_allowed)
        VALUES ('Sick Leave', 'sick_leave', 12, false)
        RETURNING id INTO v_sick_leave;
    END IF;

    IF v_casual_leave IS NULL THEN
        INSERT INTO leave_types (leave_name, leave_type, max_days_per_year, carry_forward_allowed)
        VALUES ('Casual Leave', 'casual_leave', 10, true)
        RETURNING id INTO v_casual_leave;
    END IF;

    IF v_paid_leave IS NULL THEN
        INSERT INTO leave_types (leave_name, leave_type, max_days_per_year, carry_forward_allowed)
        VALUES ('Paid Leave', 'paid_leave', 15, true)
        RETURNING id INTO v_paid_leave;
    END IF;

    -- Insert sample leave applications
    -- 1. Approved sick leave (past)
    INSERT INTO leave_applications (
        employee_id, leave_type_id, from_date, to_date, number_of_days, 
        reason, status, approved_at
    ) VALUES (
        v_employee_1, v_sick_leave, 
        CURRENT_DATE - INTERVAL '10 days', 
        CURRENT_DATE - INTERVAL '8 days', 
        3,
        'Seasonal fever and body ache',
        'approved',
        CURRENT_DATE - INTERVAL '11 days'
    ) ON CONFLICT DO NOTHING;

    -- 2. Pending casual leave (upcoming)
    INSERT INTO leave_applications (
        employee_id, leave_type_id, from_date, to_date, number_of_days, 
        reason, status
    ) VALUES (
        v_employee_2, v_casual_leave, 
        CURRENT_DATE + INTERVAL '5 days', 
        CURRENT_DATE + INTERVAL '5 days', 
        1,
        'Family function - sister''s wedding',
        'pending'
    ) ON CONFLICT DO NOTHING;

    -- 3. Pending paid leave (upcoming vacation)
    INSERT INTO leave_applications (
        employee_id, leave_type_id, from_date, to_date, number_of_days, 
        reason, status
    ) VALUES (
        v_employee_3, v_paid_leave, 
        CURRENT_DATE + INTERVAL '15 days', 
        CURRENT_DATE + INTERVAL '20 days', 
        6,
        'Annual vacation to Goa with family',
        'pending'
    ) ON CONFLICT DO NOTHING;

    -- 4. Rejected sick leave (past)
    INSERT INTO leave_applications (
        employee_id, leave_type_id, from_date, to_date, number_of_days, 
        reason, status, rejection_reason
    ) VALUES (
        v_employee_1, v_sick_leave, 
        CURRENT_DATE - INTERVAL '5 days', 
        CURRENT_DATE - INTERVAL '4 days', 
        2,
        'Medical checkup',
        'rejected',
        'Insufficient notice period. Please apply at least 2 days in advance.'
    ) ON CONFLICT DO NOTHING;

    -- 5. Approved casual leave (currently on leave)
    INSERT INTO leave_applications (
        employee_id, leave_type_id, from_date, to_date, number_of_days, 
        reason, status, approved_at
    ) VALUES (
        v_employee_2, v_casual_leave, 
        CURRENT_DATE - INTERVAL '1 day', 
        CURRENT_DATE + INTERVAL '1 day', 
        3,
        'Personal work - property registration',
        'approved',
        CURRENT_DATE - INTERVAL '3 days'
    ) ON CONFLICT DO NOTHING;

    -- 6. Pending sick leave (urgent)
    INSERT INTO leave_applications (
        employee_id, leave_type_id, from_date, to_date, number_of_days, 
        reason, status
    ) VALUES (
        v_employee_1, v_sick_leave, 
        CURRENT_DATE, 
        CURRENT_DATE + INTERVAL '1 day', 
        2,
        'High fever and doctor advised rest',
        'pending'
    ) ON CONFLICT DO NOTHING;

    -- 7. Approved paid leave (past vacation)
    INSERT INTO leave_applications (
        employee_id, leave_type_id, from_date, to_date, number_of_days, 
        reason, status, approved_at
    ) VALUES (
        v_employee_3, v_paid_leave, 
        CURRENT_DATE - INTERVAL '30 days', 
        CURRENT_DATE - INTERVAL '25 days', 
        6,
        'Diwali vacation - visiting hometown',
        'approved',
        CURRENT_DATE - INTERVAL '35 days'
    ) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Leave application seed data inserted successfully!';
    RAISE NOTICE 'Employee 1 (Suresh): %', v_employee_1;
    RAISE NOTICE 'Employee 2 (Rajesh): %', v_employee_2;
    RAISE NOTICE 'Employee 3 (Priya): %', v_employee_3;
    RAISE NOTICE 'Sick Leave Type: %', v_sick_leave;
    RAISE NOTICE 'Casual Leave Type: %', v_casual_leave;
    RAISE NOTICE 'Paid Leave Type: %', v_paid_leave;

END $$;

-- Verify the data
SELECT 
    la.id,
    e.first_name || ' ' || e.last_name as employee_name,
    lt.leave_name,
    la.from_date,
    la.to_date,
    la.number_of_days,
    la.status,
    la.reason
FROM leave_applications la
JOIN employees e ON la.employee_id = e.id
JOIN leave_types lt ON la.leave_type_id = lt.id
ORDER BY la.created_at DESC
LIMIT 10;
