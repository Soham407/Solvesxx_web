-- =============================================================================
-- Mobile checklist submission helper
-- Provides a single authenticated RPC for the mobile guard checklist screen.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.submit_mobile_guard_checklist(
  p_checklist_id UUID,
  p_responses JSONB,
  p_is_complete BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
  v_response_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT is_guard() THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE,
      'error', 'Only authenticated guards can submit checklists'
    );
  END IF;

  IF p_checklist_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE,
      'error', 'Checklist ID is required'
    );
  END IF;

  IF JSONB_TYPEOF(COALESCE(p_responses, '[]'::JSONB)) IS DISTINCT FROM 'array' THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE,
      'error', 'Checklist responses must be a JSON array'
    );
  END IF;

  v_employee_id := get_employee_id();

  IF v_employee_id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE,
      'error', 'Guard profile is not fully configured'
    );
  END IF;

  INSERT INTO public.checklist_responses (
    employee_id,
    checklist_id,
    response_date,
    submitted_at,
    responses,
    is_complete
  )
  VALUES (
    v_employee_id,
    p_checklist_id,
    CURRENT_DATE,
    NOW(),
    COALESCE(p_responses, '[]'::JSONB),
    COALESCE(p_is_complete, TRUE)
  )
  ON CONFLICT (checklist_id, employee_id, response_date)
  DO UPDATE SET
    submitted_at = NOW(),
    responses = EXCLUDED.responses,
    is_complete = EXCLUDED.is_complete
  RETURNING id INTO v_response_id;

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'response_id', v_response_id,
    'submitted_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_mobile_guard_checklist(UUID, JSONB, BOOLEAN) TO authenticated;
