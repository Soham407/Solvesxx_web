-- Migration: Visitor Approval & Lifecycle Functions
-- Moves visitor approval/checkout logic to the database to prevent unauthorized access.
-- Enforces role-based access: guards handle check-in/out, residents handle approval.

-- Function to approve a visitor (resident action)
CREATE OR REPLACE FUNCTION approve_visitor(
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
  -- 1. Verify the caller is a resident
  SELECT EXISTS(
    SELECT 1 FROM residents WHERE auth_user_id = p_user_id
  ) INTO v_is_resident;

  IF NOT v_is_resident THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only residents can approve visitors');
  END IF;

  -- 2. Get the resident's flat_id
  SELECT flat_id INTO v_resident_flat_id
  FROM residents
  WHERE auth_user_id = p_user_id
  LIMIT 1;

  -- 3. Fetch and lock the visitor record
  SELECT * INTO v_visitor
  FROM visitors
  WHERE id = p_visitor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Visitor not found');
  END IF;

  -- 4. Verify the visitor is for this resident's flat
  IF v_visitor.flat_id IS NOT NULL AND v_visitor.flat_id != v_resident_flat_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only approve visitors for your own flat');
  END IF;

  -- 5. Check visitor hasn't already exited
  IF v_visitor.exit_time IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot approve a visitor who has already checked out');
  END IF;

  -- 6. Approve
  UPDATE visitors
  SET approved_by_resident = true
  WHERE id = p_visitor_id;

  RETURN jsonb_build_object('success', true, 'visitor_id', p_visitor_id);
END;
$$;

-- Function to check out a visitor (guard action)
CREATE OR REPLACE FUNCTION checkout_visitor(
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
BEGIN
  -- 1. Get guard ID from user (optional — may be null for admin checkout)
  SELECT sg.id INTO v_guard_id
  FROM security_guards sg
  JOIN employees e ON sg.employee_id = e.id
  WHERE e.auth_user_id = p_user_id
  LIMIT 1;

  -- 2. Fetch and lock the visitor record
  SELECT * INTO v_visitor
  FROM visitors
  WHERE id = p_visitor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Visitor not found');
  END IF;

  -- 3. Prevent double checkout
  IF v_visitor.exit_time IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Visitor has already been checked out');
  END IF;

  -- 4. Perform checkout
  UPDATE visitors
  SET
    exit_time = NOW(),
    exit_guard_id = v_guard_id
  WHERE id = p_visitor_id;

  RETURN jsonb_build_object('success', true, 'visitor_id', p_visitor_id, 'exit_time', NOW());
END;
$$;

GRANT EXECUTE ON FUNCTION approve_visitor(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION checkout_visitor(UUID, UUID) TO authenticated;;
