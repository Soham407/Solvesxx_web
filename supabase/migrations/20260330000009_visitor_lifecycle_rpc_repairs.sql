-- ============================================
-- Migration: visitor lifecycle rpc repairs
-- Description: closes VISITOR-001 authorization gaps without rewriting prior migrations
-- ============================================

CREATE OR REPLACE FUNCTION public.approve_visitor(
  p_visitor_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor RECORD;
  v_is_resident BOOLEAN;
  v_resident_flat_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authenticated user mismatch');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.residents WHERE auth_user_id = p_user_id
  ) INTO v_is_resident;

  IF NOT v_is_resident THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only residents can approve visitors');
  END IF;

  SELECT flat_id INTO v_resident_flat_id
  FROM public.residents
  WHERE auth_user_id = p_user_id
  LIMIT 1;

  SELECT * INTO v_visitor
  FROM public.visitors
  WHERE id = p_visitor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Visitor not found');
  END IF;

  IF v_visitor.flat_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Visitors without a destination flat cannot be approved');
  END IF;

  IF v_visitor.flat_id != v_resident_flat_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only approve visitors for your own flat');
  END IF;

  IF v_visitor.exit_time IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot approve a visitor who has already checked out');
  END IF;

  UPDATE public.visitors
  SET approved_by_resident = true
  WHERE id = p_visitor_id;

  RETURN jsonb_build_object('success', true, 'visitor_id', p_visitor_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.deny_visitor(
  p_visitor_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor RECORD;
  v_is_resident BOOLEAN;
  v_resident_flat_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authenticated user mismatch');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.residents WHERE auth_user_id = p_user_id
  ) INTO v_is_resident;

  IF NOT v_is_resident THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only residents can deny visitors');
  END IF;

  SELECT flat_id INTO v_resident_flat_id
  FROM public.residents
  WHERE auth_user_id = p_user_id
  LIMIT 1;

  SELECT * INTO v_visitor
  FROM public.visitors
  WHERE id = p_visitor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Visitor not found');
  END IF;

  IF v_visitor.flat_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Visitors without a destination flat cannot be denied');
  END IF;

  IF v_visitor.flat_id != v_resident_flat_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only deny visitors for your own flat');
  END IF;

  IF v_visitor.exit_time IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot deny a visitor who has already checked out');
  END IF;

  UPDATE public.visitors
  SET
    approved_by_resident = false,
    rejection_reason = p_reason
  WHERE id = p_visitor_id;

  RETURN jsonb_build_object('success', true, 'visitor_id', p_visitor_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.checkout_visitor(
  p_visitor_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor RECORD;
  v_guard_id UUID;
  v_assigned_location_id UUID;
  v_is_guard BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authenticated user mismatch');
  END IF;

  v_is_guard := is_guard();

  IF NOT (
    v_is_guard
    OR is_admin()
    OR has_role('super_admin')
    OR has_role('security_supervisor')
    OR has_role('society_manager')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only guards and visitor managers can check out visitors');
  END IF;

  IF v_is_guard THEN
    SELECT
      sg.id,
      sg.assigned_location_id
    INTO
      v_guard_id,
      v_assigned_location_id
    FROM public.security_guards sg
    JOIN public.employees e ON sg.employee_id = e.id
    WHERE e.auth_user_id = p_user_id
    LIMIT 1;

    IF v_guard_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Guard profile not found');
    END IF;
  END IF;

  SELECT * INTO v_visitor
  FROM public.visitors
  WHERE id = p_visitor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Visitor not found');
  END IF;

  IF v_visitor.exit_time IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Visitor has already been checked out');
  END IF;

  IF v_is_guard
     AND v_assigned_location_id IS NOT NULL
     AND v_visitor.entry_location_id IS DISTINCT FROM v_assigned_location_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guards can only check out visitors from their assigned gate');
  END IF;

  UPDATE public.visitors
  SET
    exit_time = NOW(),
    exit_guard_id = v_guard_id
  WHERE id = p_visitor_id;

  RETURN jsonb_build_object('success', true, 'visitor_id', p_visitor_id, 'exit_time', NOW());
END;
$$;

CREATE OR REPLACE FUNCTION public.log_visitor_bypass_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bypassed_by_auth_user_id UUID;
BEGIN
  IF NEW.bypass_reason IS NULL OR btrim(NEW.bypass_reason) = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.bypass_reason IS NOT DISTINCT FROM NEW.bypass_reason THEN
    RETURN NEW;
  END IF;

  v_bypassed_by_auth_user_id := auth.uid();

  IF v_bypassed_by_auth_user_id IS NULL AND NEW.entry_guard_id IS NOT NULL THEN
    SELECT e.auth_user_id
    INTO v_bypassed_by_auth_user_id
    FROM public.security_guards sg
    JOIN public.employees e ON e.id = sg.employee_id
    WHERE sg.id = NEW.entry_guard_id
    LIMIT 1;
  END IF;

  INSERT INTO public.visitor_bypass_audit (
    visitor_id,
    bypass_reason,
    bypassed_by_auth_user_id,
    entry_guard_id,
    resident_id,
    flat_id
  )
  VALUES (
    NEW.id,
    NEW.bypass_reason,
    v_bypassed_by_auth_user_id,
    NEW.entry_guard_id,
    NEW.resident_id,
    NEW.flat_id
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_visitor_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_guard() AND NOT is_admin() THEN
    IF OLD.flat_id IS DISTINCT FROM NEW.flat_id
       OR OLD.visitor_name IS DISTINCT FROM NEW.visitor_name
       OR OLD.approved_by_resident IS DISTINCT FROM NEW.approved_by_resident
       OR OLD.resident_id IS DISTINCT FROM NEW.resident_id
       OR OLD.visitor_type IS DISTINCT FROM NEW.visitor_type
       OR OLD.is_frequent_visitor IS DISTINCT FROM NEW.is_frequent_visitor
       OR OLD.bypass_reason IS DISTINCT FROM NEW.bypass_reason THEN
      RAISE EXCEPTION 'Security Policy: Guards cannot modify visitor approval or identity fields.';
    END IF;
  ELSIF is_resident() AND NOT is_admin() THEN
    IF OLD.flat_id IS DISTINCT FROM NEW.flat_id
       OR OLD.visitor_name IS DISTINCT FROM NEW.visitor_name
       OR OLD.approved_by_resident IS DISTINCT FROM NEW.approved_by_resident
       OR OLD.resident_id IS DISTINCT FROM NEW.resident_id
       OR OLD.visitor_type IS DISTINCT FROM NEW.visitor_type
       OR OLD.phone IS DISTINCT FROM NEW.phone
       OR OLD.vehicle_number IS DISTINCT FROM NEW.vehicle_number
       OR OLD.photo_url IS DISTINCT FROM NEW.photo_url
       OR OLD.purpose IS DISTINCT FROM NEW.purpose
       OR OLD.entry_time IS DISTINCT FROM NEW.entry_time
       OR OLD.exit_time IS DISTINCT FROM NEW.exit_time
       OR OLD.entry_guard_id IS DISTINCT FROM NEW.entry_guard_id
       OR OLD.exit_guard_id IS DISTINCT FROM NEW.exit_guard_id
       OR OLD.entry_location_id IS DISTINCT FROM NEW.entry_location_id
       OR OLD.rejection_reason IS DISTINCT FROM NEW.rejection_reason
       OR OLD.bypass_reason IS DISTINCT FROM NEW.bypass_reason
       OR OLD.visitor_pass_number IS DISTINCT FROM NEW.visitor_pass_number THEN
      RAISE EXCEPTION 'Security Policy: Residents can only update frequent visitor status from the app.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_visitor(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_visitor(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deny_visitor(UUID, UUID, TEXT) TO authenticated;

ALTER FUNCTION public.approve_visitor(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.checkout_visitor(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.deny_visitor(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.check_visitor_immutability() SET search_path = public;
