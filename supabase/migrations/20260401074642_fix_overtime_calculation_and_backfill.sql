-- Migration: Fix overtime calculation and backfill historical data
-- (1) Ensure overtime_hours column exists in attendance_logs
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(5, 2);

-- (2) Update calculate_employee_salary function to be robust
CREATE OR REPLACE FUNCTION calculate_employee_salary(
  p_employee_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_total_working_days INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee RECORD;
  v_shift RECORD;
  v_present_days INT;
  v_absent_days INT;
  v_leave_days INT;
  v_overtime_hours NUMERIC;
  v_pro_rated_basic NUMERIC;
  v_overtime_amount NUMERIC;
  v_gross_salary NUMERIC;
  v_pf_deduction NUMERIC;
  v_esic_deduction NUMERIC;
  v_professional_tax NUMERIC;
  v_total_deductions NUMERIC;
  v_net_payable NUMERIC;
  v_employer_pf NUMERIC;
  v_employer_esic NUMERIC;
  v_overtime_rate NUMERIC;
  v_standard_hours NUMERIC;
BEGIN
  -- 1. Fetch employee salary details
  SELECT * INTO v_employee
  FROM employees
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
  END IF;

  -- 2. Fetch active shift details for the period
  SELECT s.shift_name, s.start_time, s.end_time, s.standard_hours, s.duration_hours
  INTO v_shift
  FROM employee_shift_assignments esa
  JOIN shifts s ON s.id = esa.shift_id
  WHERE esa.employee_id = p_employee_id
    AND esa.is_active = true
    AND esa.assigned_from <= p_period_end
    AND (esa.assigned_to IS NULL OR esa.assigned_to >= p_period_start)
  ORDER BY esa.assigned_from DESC
  LIMIT 1;

  -- 3. Determine standard_hours for this employee/shift
  v_standard_hours := COALESCE(v_shift.standard_hours, v_shift.duration_hours);
  
  -- If still NULL, try to calculate from start/end times
  IF v_standard_hours IS NULL AND v_shift.start_time IS NOT NULL AND v_shift.end_time IS NOT NULL THEN
    IF v_shift.end_time < v_shift.start_time THEN
      -- Night shift spanning midnight
      v_standard_hours := EXTRACT(EPOCH FROM (v_shift.end_time + INTERVAL '24 hours' - v_shift.start_time)) / 3600;
    ELSE
      v_standard_hours := EXTRACT(EPOCH FROM (v_shift.end_time - v_shift.start_time)) / 3600;
    END IF;
  END IF;

  -- Absolute fallback to 8 if all lookups fail
  v_standard_hours := COALESCE(v_standard_hours, 8);

  -- 4. Calculate attendance and overtime from attendance_logs
  -- Re-calculate overtime_hours based on total_hours - shift's standard_hours 
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE status = 'present' OR status = 'late'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'absent' OR status = 'absent_breach'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status IN ('leave', 'sick_leave', 'casual_leave', 'earned_leave')), 0),
    COALESCE(SUM(GREATEST(0, COALESCE(total_hours, 0) - v_standard_hours)), 0)
  INTO v_present_days, v_absent_days, v_leave_days, v_overtime_hours
  FROM attendance_logs
  WHERE employee_id = p_employee_id
    AND log_date BETWEEN p_period_start AND p_period_end;

  -- 5. Calculate salary components
  v_pro_rated_basic := ROUND(
    (COALESCE(v_employee.basic_salary, 0) * v_present_days) / GREATEST(p_total_working_days, 1),
    2
  );

  -- Overtime rate uses shift standard_hours
  v_overtime_rate := ROUND(
    COALESCE(v_employee.basic_salary, 0) / GREATEST(p_total_working_days, 1) / v_standard_hours * 1.5,
    2
  );
  v_overtime_amount := ROUND(v_overtime_hours * v_overtime_rate, 2);

  -- Gross salary
  v_gross_salary := v_pro_rated_basic
    + COALESCE(v_employee.hra, 0)
    + COALESCE(v_employee.special_allowance, 0)
    + COALESCE(v_employee.travel_allowance, 0)
    + COALESCE(v_employee.medical_allowance, 0)
    + v_overtime_amount;

  -- 6. Deductions
  v_pf_deduction := ROUND(v_pro_rated_basic * 0.12, 2);
  IF v_gross_salary <= 21000 THEN
    v_esic_deduction := ROUND(v_gross_salary * 0.0075, 2);
  ELSE
    v_esic_deduction := 0;
  END IF;

  IF v_gross_salary <= 15000 THEN
    v_professional_tax := 0;
  ELSE
    v_professional_tax := 200;
  END IF;

  v_total_deductions := v_pf_deduction + v_esic_deduction + v_professional_tax;

  -- 7. Net payable
  v_net_payable := v_gross_salary - v_total_deductions;

  -- 8. Employer contributions
  v_employer_pf := ROUND(v_pro_rated_basic * 0.12, 2);
  IF v_gross_salary <= 21000 THEN
    v_employer_esic := ROUND(v_gross_salary * 0.0325, 2);
  ELSE
    v_employer_esic := 0;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'employee_id', p_employee_id,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'present_days', v_present_days,
    'absent_days', v_absent_days,
    'leave_days', v_leave_days,
    'overtime_hours', v_overtime_hours,
    'overtime_rate', v_overtime_rate,
    'overtime_amount', v_overtime_amount,
    'pro_rated_basic', v_pro_rated_basic,
    'gross_salary', v_gross_salary,
    'pf_deduction', v_pf_deduction,
    'esic_deduction', v_esic_deduction,
    'professional_tax', v_professional_tax,
    'total_deductions', v_total_deductions,
    'net_payable', v_net_payable,
    'employer_pf', v_employer_pf,
    'employer_esic', v_employer_esic,
    'standard_hours', v_standard_hours,
    'shift_name', COALESCE(v_shift.shift_name, 'General Shift')
  );
END;
$$;

-- (3) Backfill historical overtime_hours in attendance_logs
-- This will recalculate overtime_hours for all records where it is currently NULL 
-- or potentially incorrect (based on the new shift logic).
-- We use a CTE to find the active shift for each attendance log entry.
WITH shift_data AS (
  SELECT 
    al.id as log_id,
    COALESCE(s.standard_hours, s.duration_hours, 8) as calculated_standard_hours
  FROM attendance_logs al
  LEFT JOIN LATERAL (
    SELECT s.standard_hours, s.duration_hours
    FROM employee_shift_assignments esa
    JOIN shifts s ON s.id = esa.shift_id
    WHERE esa.employee_id = al.employee_id
      AND esa.is_active = true
      AND esa.assigned_from <= al.log_date
      AND (esa.assigned_to IS NULL OR esa.assigned_to >= al.log_date)
    ORDER BY esa.assigned_from DESC
    LIMIT 1
  ) s ON true
)
UPDATE attendance_logs al
SET 
  overtime_hours = GREATEST(0, COALESCE(al.total_hours, 0) - sd.calculated_standard_hours),
  updated_at = NOW()
FROM shift_data sd
WHERE al.id = sd.log_id
  AND al.check_out_time IS NOT NULL;
