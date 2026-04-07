-- ============================================
-- Migration: HRMS workflow truth repairs
-- Description:
--   1. Fix leave application RLS so employees can submit leave and supervisors can approve it.
--   2. Sync approved leave into attendance_logs so attendance and payroll stay truthful.
--   3. Realign payroll policies and RPCs with the live schema and admin-only mutation model.
-- ============================================

ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View Payroll Cycles" ON public.payroll_cycles;
DROP POLICY IF EXISTS "Manage Payroll Cycles" ON public.payroll_cycles;
DROP POLICY IF EXISTS "Account and admin can view payroll_cycles" ON public.payroll_cycles;
DROP POLICY IF EXISTS "Admin can modify payroll_cycles" ON public.payroll_cycles;

CREATE POLICY "payroll_cycles_select"
ON public.payroll_cycles
FOR SELECT
TO authenticated
USING (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN ('admin', 'super_admin', 'account')
);

CREATE POLICY "payroll_cycles_manage_admin"
ON public.payroll_cycles
FOR ALL
TO authenticated
USING (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN ('admin', 'super_admin')
)
WITH CHECK (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN ('admin', 'super_admin')
);

DROP POLICY IF EXISTS "Employees View Own Payslips" ON public.payslips;
DROP POLICY IF EXISTS "Manage Payslips" ON public.payslips;

CREATE POLICY "payslips_select"
ON public.payslips
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT e.id
    FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
  )
  OR COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN ('admin', 'super_admin', 'account')
);

CREATE POLICY "payslips_manage_admin"
ON public.payslips
FOR ALL
TO authenticated
USING (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN ('admin', 'super_admin')
)
WITH CHECK (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN ('admin', 'super_admin')
);

DROP POLICY IF EXISTS "leave_applications_select" ON public.leave_applications;
DROP POLICY IF EXISTS "leave_applications_insert_own" ON public.leave_applications;
DROP POLICY IF EXISTS "leave_applications_update_managers" ON public.leave_applications;

CREATE POLICY "leave_applications_select"
ON public.leave_applications
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT e.id
    FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
  )
  OR COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN (
    'admin',
    'super_admin',
    'company_hod',
    'society_manager',
    'security_supervisor'
  )
);

CREATE POLICY "leave_applications_insert_own"
ON public.leave_applications
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (
    SELECT e.id
    FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
  )
  AND status = 'pending'
  AND approved_by IS NULL
);

CREATE POLICY "leave_applications_update_managers"
ON public.leave_applications
FOR UPDATE
TO authenticated
USING (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN (
    'admin',
    'super_admin',
    'company_hod',
    'society_manager',
    'security_supervisor'
  )
)
WITH CHECK (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN (
    'admin',
    'super_admin',
    'company_hod',
    'society_manager',
    'security_supervisor'
  )
);

CREATE OR REPLACE FUNCTION public.map_leave_type_to_attendance_status(p_leave_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE COALESCE(p_leave_type, '')
    WHEN 'casual_leave' THEN RETURN 'casual_leave';
    WHEN 'sick_leave' THEN RETURN 'sick_leave';
    WHEN 'earned_leave' THEN RETURN 'earned_leave';
    WHEN 'paid_leave' THEN RETURN 'paid_leave';
    WHEN 'unpaid_leave' THEN RETURN 'unpaid_leave';
    ELSE RETURN 'leave';
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_leave_application_attendance(p_leave_application_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leave RECORD;
  v_log_date DATE;
  v_note_marker TEXT;
  v_attendance_status TEXT;
BEGIN
  SELECT
    la.id,
    la.employee_id,
    la.from_date,
    la.to_date,
    la.status,
    lt.leave_type::TEXT AS leave_type
  INTO v_leave
  FROM public.leave_applications la
  LEFT JOIN public.leave_types lt
    ON lt.id = la.leave_type_id
  WHERE la.id = p_leave_application_id;

  v_note_marker := format('Synced from leave application %s', p_leave_application_id);

  DELETE FROM public.attendance_logs
  WHERE notes = v_note_marker;

  IF v_leave.id IS NULL THEN
    RETURN;
  END IF;

  IF v_leave.status <> 'approved' THEN
    RETURN;
  END IF;

  v_attendance_status := public.map_leave_type_to_attendance_status(v_leave.leave_type);

  FOR v_log_date IN
    SELECT generate_series(v_leave.from_date, v_leave.to_date, INTERVAL '1 day')::DATE
  LOOP
    UPDATE public.attendance_logs
    SET
      check_in_time = NULL,
      check_out_time = NULL,
      check_in_location_id = NULL,
      check_out_location_id = NULL,
      check_in_latitude = NULL,
      check_in_longitude = NULL,
      check_out_latitude = NULL,
      check_out_longitude = NULL,
      check_in_selfie_url = NULL,
      total_hours = 0,
      overtime_hours = 0,
      is_auto_punch_out = FALSE,
      status = v_attendance_status,
      notes = v_note_marker,
      updated_at = NOW()
    WHERE employee_id = v_leave.employee_id
      AND log_date = v_log_date
      AND check_in_time IS NULL
      AND check_out_time IS NULL;

    IF NOT FOUND THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.attendance_logs al
        WHERE al.employee_id = v_leave.employee_id
          AND al.log_date = v_log_date
          AND (al.check_in_time IS NOT NULL OR al.check_out_time IS NOT NULL)
      ) THEN
        INSERT INTO public.attendance_logs (
          id,
          employee_id,
          log_date,
          total_hours,
          overtime_hours,
          status,
          is_auto_punch_out,
          notes
        )
        VALUES (
          gen_random_uuid(),
          v_leave.employee_id,
          v_log_date,
          0,
          0,
          v_attendance_status,
          FALSE,
          v_note_marker
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_leave_application_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_leave_application_attendance(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_cleanup_leave_application_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.attendance_logs
  WHERE employee_id = OLD.employee_id
    AND notes = format('Synced from leave application %s', OLD.id);

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_leave_application_attendance ON public.leave_applications;
CREATE TRIGGER trg_sync_leave_application_attendance
AFTER INSERT OR UPDATE OF employee_id, leave_type_id, from_date, to_date, status
ON public.leave_applications
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_leave_application_attendance();

DROP TRIGGER IF EXISTS trg_cleanup_leave_application_attendance ON public.leave_applications;
CREATE TRIGGER trg_cleanup_leave_application_attendance
AFTER DELETE
ON public.leave_applications
FOR EACH ROW
EXECUTE FUNCTION public.trg_cleanup_leave_application_attendance();

CREATE OR REPLACE FUNCTION public.validate_clock_in_geofence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.check_in_time IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.check_in_latitude IS NULL OR NEW.check_in_longitude IS NULL THEN
    IF has_role('admin')
      OR has_role('super_admin')
      OR has_role('security_supervisor')
      OR has_role('society_manager')
      OR has_role('site_supervisor') THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION
      'Clock-in rejected: GPS coordinates are required to validate the geo-fence boundary.';
  END IF;

  IF NEW.check_in_location_id IS NULL THEN
    IF has_role('admin')
      OR has_role('super_admin')
      OR has_role('security_supervisor')
      OR has_role('society_manager')
      OR has_role('site_supervisor') THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION
      'Clock-in rejected: A check-in location is required for geo-fence validation.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.company_locations cl
    WHERE cl.id = NEW.check_in_location_id
      AND cl.latitude IS NOT NULL
      AND cl.longitude IS NOT NULL
  ) THEN
    RETURN NEW;
  END IF;

  IF NOT check_geofence(
    NEW.check_in_latitude::double precision,
    NEW.check_in_longitude::double precision,
    (
      SELECT cl.latitude::double precision
      FROM public.company_locations cl
      WHERE cl.id = NEW.check_in_location_id
    ),
    (
      SELECT cl.longitude::double precision
      FROM public.company_locations cl
      WHERE cl.id = NEW.check_in_location_id
    ),
    COALESCE(
      (
        SELECT cl.geo_fence_radius::double precision
        FROM public.company_locations cl
        WHERE cl.id = NEW.check_in_location_id
      ),
      100.0
    )
  ) THEN
    RAISE EXCEPTION
      'Clock-in rejected: You are outside the geo-fence boundary for this location. Please move closer to your assigned location.';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  v_leave_id UUID;
BEGIN
  FOR v_leave_id IN
    SELECT id
    FROM public.leave_applications
  LOOP
    PERFORM public.sync_leave_application_attendance(v_leave_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_employee_salary(
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
  v_present_days INT := 0;
  v_absent_days INT := 0;
  v_leave_days INT := 0;
  v_payable_days INT := 0;
  v_overtime_hours NUMERIC := 0;
  v_basic_salary NUMERIC := 0;
  v_hra NUMERIC := 0;
  v_special_allowance NUMERIC := 0;
  v_travel_allowance NUMERIC := 0;
  v_medical_allowance NUMERIC := 0;
  v_basic_depends BOOLEAN := TRUE;
  v_hra_depends BOOLEAN := TRUE;
  v_special_depends BOOLEAN := TRUE;
  v_travel_depends BOOLEAN := FALSE;
  v_medical_depends BOOLEAN := FALSE;
  v_pay_ratio NUMERIC := 0;
  v_pro_rated_basic NUMERIC := 0;
  v_payable_hra NUMERIC := 0;
  v_payable_special_allowance NUMERIC := 0;
  v_payable_travel_allowance NUMERIC := 0;
  v_payable_medical_allowance NUMERIC := 0;
  v_overtime_amount NUMERIC := 0;
  v_gross_salary NUMERIC := 0;
  v_pf_deduction NUMERIC := 0;
  v_esic_deduction NUMERIC := 0;
  v_professional_tax NUMERIC := 0;
  v_total_deductions NUMERIC := 0;
  v_net_payable NUMERIC := 0;
  v_employer_pf NUMERIC := 0;
  v_employer_esic NUMERIC := 0;
  v_overtime_rate NUMERIC := 0;
  v_standard_hours NUMERIC := 8;
BEGIN
  SELECT *
  INTO v_employee
  FROM public.employees
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
  END IF;

  WITH ranked_components AS (
    SELECT
      sc.abbr,
      sc.depends_on_payment_days,
      ess.amount,
      ROW_NUMBER() OVER (
        PARTITION BY ess.component_id
        ORDER BY ess.effective_from DESC, ess.created_at DESC NULLS LAST, ess.id DESC
      ) AS rn
    FROM public.employee_salary_structure ess
    JOIN public.salary_components sc
      ON sc.id = ess.component_id
    WHERE ess.employee_id = p_employee_id
      AND ess.effective_from <= p_period_end
      AND (ess.effective_to IS NULL OR ess.effective_to >= p_period_start)
  )
  SELECT
    COALESCE(MAX(CASE WHEN abbr = 'B' THEN amount END), 0) / 100.0,
    COALESCE(MAX(CASE WHEN abbr = 'HRA' THEN amount END), 0) / 100.0,
    COALESCE(MAX(CASE WHEN abbr = 'SA' THEN amount END), 0) / 100.0,
    COALESCE(MAX(CASE WHEN abbr = 'TA' THEN amount END), 0) / 100.0,
    COALESCE(MAX(CASE WHEN abbr = 'MA' THEN amount END), 0) / 100.0,
    COALESCE(BOOL_OR(CASE WHEN abbr = 'B' THEN depends_on_payment_days END), TRUE),
    COALESCE(BOOL_OR(CASE WHEN abbr = 'HRA' THEN depends_on_payment_days END), TRUE),
    COALESCE(BOOL_OR(CASE WHEN abbr = 'SA' THEN depends_on_payment_days END), TRUE),
    COALESCE(BOOL_OR(CASE WHEN abbr = 'TA' THEN depends_on_payment_days END), FALSE),
    COALESCE(BOOL_OR(CASE WHEN abbr = 'MA' THEN depends_on_payment_days END), FALSE)
  INTO
    v_basic_salary,
    v_hra,
    v_special_allowance,
    v_travel_allowance,
    v_medical_allowance,
    v_basic_depends,
    v_hra_depends,
    v_special_depends,
    v_travel_depends,
    v_medical_depends
  FROM ranked_components
  WHERE rn = 1;

  IF v_basic_salary <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Employee salary structure is not configured'
    );
  END IF;

  SELECT
    s.shift_name,
    s.start_time,
    s.end_time,
    s.standard_hours,
    s.duration_hours
  INTO v_shift
  FROM public.employee_shift_assignments esa
  JOIN public.shifts s
    ON s.id = esa.shift_id
  WHERE esa.employee_id = p_employee_id
    AND esa.is_active = TRUE
    AND esa.assigned_from <= p_period_end
    AND (esa.assigned_to IS NULL OR esa.assigned_to >= p_period_start)
  ORDER BY esa.assigned_from DESC
  LIMIT 1;

  v_standard_hours := COALESCE(v_shift.standard_hours, v_shift.duration_hours, 8);

  IF v_shift.start_time IS NOT NULL AND v_shift.end_time IS NOT NULL AND v_standard_hours IS NULL THEN
    IF v_shift.end_time < v_shift.start_time THEN
      v_standard_hours := EXTRACT(EPOCH FROM (v_shift.end_time + INTERVAL '24 hours' - v_shift.start_time)) / 3600;
    ELSE
      v_standard_hours := EXTRACT(EPOCH FROM (v_shift.end_time - v_shift.start_time)) / 3600;
    END IF;
  END IF;

  v_standard_hours := COALESCE(v_standard_hours, 8);

  SELECT
    COALESCE(COUNT(*) FILTER (WHERE status IN ('present', 'late')), 0),
    COALESCE(COUNT(*) FILTER (WHERE status IN ('absent', 'absent_breach', 'unpaid_leave')), 0),
    COALESCE(COUNT(*) FILTER (WHERE status IN ('leave', 'on_leave', 'paid_leave', 'casual_leave', 'sick_leave', 'earned_leave')), 0),
    COALESCE(SUM(GREATEST(0, COALESCE(total_hours, 0) - v_standard_hours)), 0)
  INTO
    v_present_days,
    v_absent_days,
    v_leave_days,
    v_overtime_hours
  FROM public.attendance_logs
  WHERE employee_id = p_employee_id
    AND log_date BETWEEN p_period_start AND p_period_end;

  v_payable_days := v_present_days + v_leave_days;
  v_pay_ratio := LEAST(1, GREATEST(0, v_payable_days::NUMERIC / GREATEST(p_total_working_days, 1)));

  v_pro_rated_basic := ROUND(CASE WHEN v_basic_depends THEN v_basic_salary * v_pay_ratio ELSE v_basic_salary END, 2);
  v_payable_hra := ROUND(CASE WHEN v_hra_depends THEN v_hra * v_pay_ratio ELSE v_hra END, 2);
  v_payable_special_allowance := ROUND(
    CASE WHEN v_special_depends THEN v_special_allowance * v_pay_ratio ELSE v_special_allowance END,
    2
  );
  v_payable_travel_allowance := ROUND(
    CASE WHEN v_travel_depends THEN v_travel_allowance * v_pay_ratio ELSE v_travel_allowance END,
    2
  );
  v_payable_medical_allowance := ROUND(
    CASE WHEN v_medical_depends THEN v_medical_allowance * v_pay_ratio ELSE v_medical_allowance END,
    2
  );

  v_overtime_rate := ROUND(v_basic_salary / GREATEST(p_total_working_days, 1) / GREATEST(v_standard_hours, 1) * 1.5, 2);
  v_overtime_amount := ROUND(v_overtime_hours * v_overtime_rate, 2);

  v_gross_salary := v_pro_rated_basic
    + v_payable_hra
    + v_payable_special_allowance
    + v_payable_travel_allowance
    + v_payable_medical_allowance
    + v_overtime_amount;

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
  v_net_payable := v_gross_salary - v_total_deductions;
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
    'basic_salary', v_basic_salary,
    'pro_rated_basic', v_pro_rated_basic,
    'hra', v_payable_hra,
    'special_allowance', v_payable_special_allowance,
    'travel_allowance', v_payable_travel_allowance,
    'medical_allowance', v_payable_medical_allowance,
    'gross_salary', v_gross_salary,
    'pf_deduction', v_pf_deduction,
    'esic_deduction', v_esic_deduction,
    'professional_tax', v_professional_tax,
    'tds', 0,
    'total_deductions', v_total_deductions,
    'net_payable', v_net_payable,
    'employer_pf', v_employer_pf,
    'employer_esic', v_employer_esic,
    'standard_hours', v_standard_hours,
    'shift_name', COALESCE(v_shift.shift_name, 'General Shift')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_payroll_cycle(
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
  v_actor_role TEXT;
  v_payslip_number TEXT;
  v_total_gross NUMERIC := 0;
  v_total_deductions NUMERIC := 0;
  v_total_net NUMERIC := 0;
  v_emp_count INT := 0;
  v_seq INT := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payroll generation requires an authenticated admin session'
    );
  END IF;

  v_actor_role := COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT);

  IF v_actor_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only admins can generate payroll cycles'
    );
  END IF;

  SELECT *
  INTO v_cycle
  FROM public.payroll_cycles
  WHERE id = p_cycle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payroll cycle not found');
  END IF;

  IF v_cycle.status <> 'draft' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Cannot generate payslips for cycle in "%s" status', v_cycle.status)
    );
  END IF;

  DELETE FROM public.payslips
  WHERE payroll_cycle_id = p_cycle_id;

  UPDATE public.payroll_cycles
  SET
    status = 'processing',
    updated_at = NOW()
  WHERE id = p_cycle_id;

  FOR v_emp IN
    SELECT e.id, e.employee_code
    FROM public.employees e
    WHERE e.is_active = TRUE
    ORDER BY e.employee_code
  LOOP
    v_salary := public.calculate_employee_salary(
      v_emp.id,
      v_cycle.period_start,
      v_cycle.period_end,
      v_cycle.total_working_days
    );

    IF COALESCE((v_salary ->> 'success')::BOOLEAN, FALSE) THEN
      v_seq := v_seq + 1;
      v_payslip_number := format(
        'PS-%s-%s-%s',
        v_cycle.period_year,
        LPAD(v_cycle.period_month::TEXT, 2, '0'),
        LPAD(v_seq::TEXT, 4, '0')
      );

      INSERT INTO public.payslips (
        payslip_number,
        payroll_cycle_id,
        employee_id,
        present_days,
        absent_days,
        leave_days,
        overtime_hours,
        basic_salary,
        pro_rated_basic,
        hra,
        special_allowance,
        travel_allowance,
        medical_allowance,
        overtime_amount,
        bonus,
        other_earnings,
        gross_salary,
        pf_deduction,
        esic_deduction,
        professional_tax,
        tds,
        loan_recovery,
        advance_recovery,
        other_deductions,
        total_deductions,
        net_payable,
        employer_pf,
        employer_esic,
        bank_account_number,
        bank_ifsc,
        status,
        created_by,
        updated_by
      ) VALUES (
        v_payslip_number,
        p_cycle_id,
        v_emp.id,
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
        0,
        0,
        (v_salary ->> 'gross_salary')::NUMERIC,
        (v_salary ->> 'pf_deduction')::NUMERIC,
        (v_salary ->> 'esic_deduction')::NUMERIC,
        (v_salary ->> 'professional_tax')::NUMERIC,
        0,
        0,
        0,
        0,
        (v_salary ->> 'total_deductions')::NUMERIC,
        (v_salary ->> 'net_payable')::NUMERIC,
        (v_salary ->> 'employer_pf')::NUMERIC,
        (v_salary ->> 'employer_esic')::NUMERIC,
        NULL,
        NULL,
        'computed',
        p_user_id,
        p_user_id
      );

      v_total_gross := v_total_gross + (v_salary ->> 'gross_salary')::NUMERIC;
      v_total_deductions := v_total_deductions + (v_salary ->> 'total_deductions')::NUMERIC;
      v_total_net := v_total_net + (v_salary ->> 'net_payable')::NUMERIC;
      v_emp_count := v_emp_count + 1;
    ELSE
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object(
          'employee_id', v_emp.id,
          'employee_code', v_emp.employee_code,
          'error', COALESCE(v_salary ->> 'error', 'Payroll calculation failed')
        )
      );
    END IF;
  END LOOP;

  IF v_emp_count = 0 THEN
    UPDATE public.payroll_cycles
    SET
      status = 'draft',
      updated_at = NOW(),
      notes = TRIM(
        BOTH ' '
        FROM CONCAT_WS(' | ', NULLIF(notes, ''), 'Payroll generation blocked: no employees with valid salary structure.')
      )
    WHERE id = p_cycle_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'No eligible employees with configured salary structure',
      'details', v_errors
    );
  END IF;

  UPDATE public.payroll_cycles
  SET
    status = 'computed',
    computed_at = NOW(),
    computed_by = p_user_id,
    total_employees = v_emp_count,
    total_gross = v_total_gross,
    total_deductions = v_total_deductions,
    total_net = v_total_net,
    notes = CASE
      WHEN jsonb_array_length(v_errors) > 0 THEN
        TRIM(
          BOTH ' '
          FROM CONCAT_WS(
            ' | ',
            NULLIF(notes, ''),
            format('Skipped %s employee(s) without payroll master data.', jsonb_array_length(v_errors))
          )
        )
      ELSE notes
    END,
    updated_at = NOW()
  WHERE id = p_cycle_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_employees', v_emp_count,
    'total_gross', v_total_gross,
    'total_deductions', v_total_deductions,
    'total_net', v_total_net,
    'skipped', v_errors
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.map_leave_type_to_attendance_status(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_leave_application_attendance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_employee_salary(UUID, DATE, DATE, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_payroll_cycle(UUID, UUID) TO authenticated;
