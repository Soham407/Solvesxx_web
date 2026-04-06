-- ============================================
-- Migration: HRMS salary structure UI support
-- Description:
--   1. Align salary master-data policies with live app roles.
--   2. Add an atomic helper for versioned employee salary component maintenance.
-- ============================================

ALTER TABLE public.salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salary_structure ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View Salary Components" ON public.salary_components;
DROP POLICY IF EXISTS "Manage Salary Components" ON public.salary_components;

CREATE POLICY "salary_components_select"
ON public.salary_components
FOR SELECT
TO authenticated
USING (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN (
    'admin',
    'super_admin',
    'company_hod',
    'company_md',
    'account'
  )
);

CREATE POLICY "salary_components_manage"
ON public.salary_components
FOR ALL
TO authenticated
USING (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN (
    'admin',
    'super_admin',
    'account'
  )
)
WITH CHECK (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN (
    'admin',
    'super_admin',
    'account'
  )
);

DROP POLICY IF EXISTS "Employees View Own Salary Structure" ON public.employee_salary_structure;
DROP POLICY IF EXISTS "Manage Employee Salary Structure" ON public.employee_salary_structure;

CREATE POLICY "employee_salary_structure_select"
ON public.employee_salary_structure
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
    'account',
    'company_hod',
    'company_md'
  )
);

CREATE POLICY "employee_salary_structure_manage"
ON public.employee_salary_structure
FOR ALL
TO authenticated
USING (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN (
    'admin',
    'super_admin',
    'account'
  )
)
WITH CHECK (
  COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT) IN (
    'admin',
    'super_admin',
    'account'
  )
);

CREATE OR REPLACE FUNCTION public.upsert_employee_salary_component(
  p_employee_id UUID,
  p_component_id UUID,
  p_amount BIGINT,
  p_effective_from DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role TEXT;
  v_current public.employee_salary_structure%ROWTYPE;
  v_component_exists BOOLEAN;
  v_employee_exists BOOLEAN;
  v_salary_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Salary structure update requires an authenticated session';
  END IF;

  v_actor_role := COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT);

  IF v_actor_role NOT IN ('admin', 'super_admin', 'account') THEN
    RAISE EXCEPTION 'Only payroll admins can maintain employee salary structure';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Salary amount must be greater than zero';
  END IF;

  IF p_effective_from IS NULL THEN
    RAISE EXCEPTION 'Effective from date is required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = p_employee_id
      AND e.is_active = TRUE
  )
  INTO v_employee_exists;

  IF NOT v_employee_exists THEN
    RAISE EXCEPTION 'Employee not found or inactive';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.salary_components sc
    WHERE sc.id = p_component_id
      AND sc.is_active = TRUE
  )
  INTO v_component_exists;

  IF NOT v_component_exists THEN
    RAISE EXCEPTION 'Salary component not found or inactive';
  END IF;

  SELECT *
  INTO v_current
  FROM public.employee_salary_structure ess
  WHERE ess.employee_id = p_employee_id
    AND ess.component_id = p_component_id
    AND ess.effective_to IS NULL
  ORDER BY ess.effective_from DESC, ess.created_at DESC NULLS LAST, ess.id DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_current.effective_from = p_effective_from THEN
      UPDATE public.employee_salary_structure
      SET
        amount = p_amount,
        notes = p_notes,
        updated_at = NOW(),
        updated_by = auth.uid(),
        effective_to = NULL
      WHERE id = v_current.id
      RETURNING id INTO v_salary_id;

      RETURN v_salary_id;
    END IF;

    IF p_effective_from < v_current.effective_from THEN
      RAISE EXCEPTION 'Cannot backdate before the current active component start date (%).', v_current.effective_from;
    END IF;

    UPDATE public.employee_salary_structure
    SET
      effective_to = p_effective_from - 1,
      updated_at = NOW(),
      updated_by = auth.uid()
    WHERE id = v_current.id;
  END IF;

  INSERT INTO public.employee_salary_structure (
    employee_id,
    component_id,
    amount,
    effective_from,
    effective_to,
    notes,
    created_by,
    updated_by
  )
  VALUES (
    p_employee_id,
    p_component_id,
    p_amount,
    p_effective_from,
    NULL,
    p_notes,
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_salary_id;

  RETURN v_salary_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_employee_salary_component(UUID, UUID, BIGINT, DATE, TEXT) TO authenticated;
