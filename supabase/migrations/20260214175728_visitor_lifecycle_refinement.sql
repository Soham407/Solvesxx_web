
-- 1. Add rejection_reason and change approved_by_resident default
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE visitors ALTER COLUMN approved_by_resident SET DEFAULT NULL;

-- 2. Create deny_visitor RPC
CREATE OR REPLACE FUNCTION public.deny_visitor(
    p_visitor_id UUID,
    p_user_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
    RETURN jsonb_build_object('success', false, 'error', 'Only residents can deny visitors');
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
    RETURN jsonb_build_object('success', false, 'error', 'You can only deny visitors for your own flat');
  END IF;

  -- 5. Check visitor hasn't already exited
  IF v_visitor.exit_time IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot deny a visitor who has already checked out');
  END IF;

  -- 6. Deny
  UPDATE visitors
  SET 
    approved_by_resident = false,
    rejection_reason = p_reason
  WHERE id = p_visitor_id;

  RETURN jsonb_build_object('success', true, 'visitor_id', p_visitor_id);
END;
$$;
;
