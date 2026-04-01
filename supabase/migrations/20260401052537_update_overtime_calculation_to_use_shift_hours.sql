-- Migration: Update overtime calculation to use employee's shift duration_hours
-- Replaces the hardcoded 8 hours with the actual shift duration from shifts table.

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
  v_attendance RECORD;
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

  -- 2. Fetch active shift duration
  SELECT s.duration_hours INTO v_shift
  FROM employee_shift_assignments esa
  JOIN shifts s ON s.id = esa.shift_id
  WHERE esa.employee_id = p_employee_id
    AND esa.is_active = true
  LIMIT 1;

  v_standard_hours := COALESCE(v_shift.duration_hours, 8);

  -- 3. Calculate attendance from attendance_logs
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE status = 'present'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'absent'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status IN ('leave', 'sick_leave', 'casual_leave', 'earned_leave')), 0),
    COALESCE(SUM(COALESCE(overtime_hours, 0)), 0)
  INTO v_present_days, v_absent_days, v_leave_days, v_overtime_hours
  FROM attendance_logs
  WHERE employee_id = p_employee_id
    AND log_date BETWEEN p_period_start AND p_period_end;

  -- 4. Calculate salary components
  -- Pro-rate basic salary based on attendance
  v_pro_rated_basic := ROUND(
    (COALESCE(v_employee.basic_salary, 0) * v_present_days) / GREATEST(p_total_working_days, 1),
    2
  );

  -- Overtime rate uses shift duration_hours instead of hardcoded 8
  v_overtime_rate := ROUND(
    COALESCE(v_employee.basic_salary, 0) / GREATEST(p_total_working_days, 1) / v_standard_hours * 1.5,
    2
  );
  v_overtime_amount := ROUND(v_overtime_hours * v_overtime_rate, 2);

  -- Gross salary: pro-rated basic + fixed allowances + overtime
  v_gross_salary := v_pro_rated_basic
    + COALESCE(v_employee.hra, 0)
    + COALESCE(v_employee.special_allowance, 0)
    + COALESCE(v_employee.travel_allowance, 0)
    + COALESCE(v_employee.medical_allowance, 0)
    + v_overtime_amount;

  -- 5. Deductions
  -- PF: 12% of pro-rated basic
  v_pf_deduction := ROUND(v_pro_rated_basic * 0.12, 2);

  -- ESIC: 0.75% of gross if gross <= 21000
  IF v_gross_salary <= 21000 THEN
    v_esic_deduction := ROUND(v_gross_salary * 0.0075, 2);
  ELSE
    v_esic_deduction := 0;
  END IF;

  -- Professional Tax (Karnataka slab)
  IF v_gross_salary <= 15000 THEN
    v_professional_tax := 0;
  ELSE
    v_professional_tax := 200;
  END IF;

  v_total_deductions := v_pf_deduction + v_esic_deduction + v_professional_tax;

  -- 6. Net payable
  v_net_payable := v_gross_salary - v_total_deductions;

  -- 7. Employer contributions
  v_employer_pf := ROUND(v_pro_rated_basic * 0.13, 2);
  v_employer_esic := ROUND(v_gross_salary * 0.0325, 2);

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
    'standard_hours', v_standard_hours
  );
END;
$$;
