-- Migration: Server-side Payroll Salary Calculation Function
-- Moves salary calculation logic to the database to prevent client-side manipulation.
-- All monetary values are in rupees with 2 decimal places.

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
BEGIN
  -- 1. Fetch employee salary details
  SELECT * INTO v_employee
  FROM employees
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
  END IF;

  -- 2. Calculate attendance from attendance_logs
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE status = 'present'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'absent'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status IN ('leave', 'sick_leave', 'casual_leave', 'earned_leave')), 0),
    COALESCE(SUM(COALESCE(overtime_hours, 0)), 0)
  INTO v_present_days, v_absent_days, v_leave_days, v_overtime_hours
  FROM attendance_logs
  WHERE employee_id = p_employee_id
    AND log_date BETWEEN p_period_start AND p_period_end;

  -- 3. Calculate salary components
  -- Pro-rate basic salary based on attendance
  v_pro_rated_basic := ROUND(
    (COALESCE(v_employee.basic_salary, 0) * v_present_days) / GREATEST(p_total_working_days, 1),
    2
  );

  -- Overtime
  v_overtime_rate := ROUND(
    COALESCE(v_employee.basic_salary, 0) / GREATEST(p_total_working_days, 1) / 8 * 1.5,
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

  -- 4. Deductions
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

  -- 5. Net payable
  v_net_payable := v_gross_salary - v_total_deductions;

  -- 6. Employer contributions
  v_employer_pf := ROUND(v_pro_rated_basic * 0.12, 2);
  IF v_gross_salary <= 21000 THEN
    v_employer_esic := ROUND(v_gross_salary * 0.0325, 2);
  ELSE
    v_employer_esic := 0;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'employee_id', p_employee_id,
    'present_days', v_present_days,
    'absent_days', v_absent_days,
    'leave_days', v_leave_days,
    'overtime_hours', v_overtime_hours,
    'basic_salary', COALESCE(v_employee.basic_salary, 0),
    'pro_rated_basic', v_pro_rated_basic,
    'hra', COALESCE(v_employee.hra, 0),
    'special_allowance', COALESCE(v_employee.special_allowance, 0),
    'travel_allowance', COALESCE(v_employee.travel_allowance, 0),
    'medical_allowance', COALESCE(v_employee.medical_allowance, 0),
    'overtime_amount', v_overtime_amount,
    'gross_salary', v_gross_salary,
    'pf_deduction', v_pf_deduction,
    'esic_deduction', v_esic_deduction,
    'professional_tax', v_professional_tax,
    'tds', 0,
    'total_deductions', v_total_deductions,
    'net_payable', v_net_payable,
    'employer_pf', v_employer_pf,
    'employer_esic', v_employer_esic
  );
END;
$$;

-- Function to generate payslips for a payroll cycle (server-side)
CREATE OR REPLACE FUNCTION generate_payroll_cycle(
  p_cycle_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle RECORD;
  v_emp RECORD;
  v_salary JSONB;
  v_payslip_number TEXT;
  v_total_gross NUMERIC := 0;
  v_total_deductions NUMERIC := 0;
  v_total_net NUMERIC := 0;
  v_emp_count INT := 0;
  v_seq INT := 0;
BEGIN
  -- 1. Lock and validate cycle
  SELECT * INTO v_cycle
  FROM payroll_cycles
  WHERE id = p_cycle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payroll cycle not found');
  END IF;

  IF v_cycle.status != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', format('Cannot generate payslips for cycle in "%s" status', v_cycle.status));
  END IF;

  -- 2. Mark as processing
  UPDATE payroll_cycles SET status = 'processing' WHERE id = p_cycle_id;

  -- 3. Calculate salary for each active employee and insert payslips
  FOR v_emp IN
    SELECT id, employee_code, basic_salary, bank_account_number, bank_ifsc
    FROM employees
    WHERE status = 'active'
    ORDER BY employee_code
  LOOP
    v_salary := calculate_employee_salary(
      v_emp.id,
      v_cycle.period_start,
      v_cycle.period_end,
      v_cycle.total_working_days
    );

    IF (v_salary ->> 'success')::BOOLEAN THEN
      v_seq := v_seq + 1;
      v_payslip_number := format('PS-%s-%s-%s',
        v_cycle.period_year,
        LPAD(v_cycle.period_month::TEXT, 2, '0'),
        LPAD(v_seq::TEXT, 4, '0')
      );

      INSERT INTO payslips (
        payslip_number, payroll_cycle_id, employee_id,
        present_days, absent_days, leave_days, overtime_hours,
        basic_salary, pro_rated_basic,
        hra, special_allowance, travel_allowance, medical_allowance,
        overtime_amount, bonus, other_earnings,
        gross_salary,
        pf_deduction, esic_deduction, professional_tax, tds,
        loan_recovery, advance_recovery, other_deductions,
        total_deductions, net_payable,
        employer_pf, employer_esic,
        bank_account_number, bank_ifsc,
        status
      ) VALUES (
        v_payslip_number, p_cycle_id, v_emp.id,
        (v_salary ->> 'present_days')::INT,
        (v_salary ->> 'absent_days')::INT,
        (v_salary ->> 'leave_days')::INT,
        (v_salary ->> 'overtime_hours')::NUMERIC,
        (v_salary ->> 'basic_salary')::NUMERIC,
        (v_salary ->> 'pro_rated_basic')::NUMERIC,
        (v_salary ->> 'hra')::NUMERIC,
        (v_salary ->> 'special_allowance')::NUMERIC,
        (v_salary ->> 'travel_allowance')::NUMERIC,
        (v_salary ->> 'medical_allowance')::NUMERIC,
        (v_salary ->> 'overtime_amount')::NUMERIC,
        0, 0, -- bonus, other_earnings
        (v_salary ->> 'gross_salary')::NUMERIC,
        (v_salary ->> 'pf_deduction')::NUMERIC,
        (v_salary ->> 'esic_deduction')::NUMERIC,
        (v_salary ->> 'professional_tax')::NUMERIC,
        0, -- tds
        0, 0, 0, -- loan_recovery, advance_recovery, other_deductions
        (v_salary ->> 'total_deductions')::NUMERIC,
        (v_salary ->> 'net_payable')::NUMERIC,
        (v_salary ->> 'employer_pf')::NUMERIC,
        (v_salary ->> 'employer_esic')::NUMERIC,
        v_emp.bank_account_number,
        v_emp.bank_ifsc,
        'computed'
      );

      v_total_gross := v_total_gross + (v_salary ->> 'gross_salary')::NUMERIC;
      v_total_deductions := v_total_deductions + (v_salary ->> 'total_deductions')::NUMERIC;
      v_total_net := v_total_net + (v_salary ->> 'net_payable')::NUMERIC;
      v_emp_count := v_emp_count + 1;
    END IF;
  END LOOP;

  -- 4. Mark cycle as computed
  UPDATE payroll_cycles
  SET
    status = 'computed',
    computed_at = NOW(),
    computed_by = p_user_id,
    total_employees = v_emp_count,
    total_gross = v_total_gross,
    total_deductions = v_total_deductions,
    total_net = v_total_net
  WHERE id = p_cycle_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_employees', v_emp_count,
    'total_gross', v_total_gross,
    'total_deductions', v_total_deductions,
    'total_net', v_total_net
  );
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_employee_salary(UUID, DATE, DATE, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_payroll_cycle(UUID, UUID) TO authenticated;
