CREATE OR REPLACE FUNCTION public.get_guard_visitors(
  p_include_checked_out BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id UUID,
  visitor_name TEXT,
  visitor_type TEXT,
  phone TEXT,
  purpose TEXT,
  flat_id UUID,
  flat_label TEXT,
  resident_id UUID,
  resident_name TEXT,
  vehicle_number TEXT,
  photo_url TEXT,
  entry_time TIMESTAMPTZ,
  exit_time TIMESTAMPTZ,
  entry_location_name TEXT,
  is_frequent_visitor BOOLEAN,
  approval_status TEXT,
  approval_deadline_at TIMESTAMPTZ,
  decision_at TIMESTAMPTZ,
  approved_by_resident BOOLEAN,
  rejection_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.expire_mobile_visitor_decisions();

  RETURN QUERY
  SELECT
    v.id,
    v.visitor_name::TEXT,
    COALESCE(v.visitor_type, 'guest')::TEXT AS visitor_type,
    v.phone::TEXT,
    v.purpose::TEXT,
    v.flat_id,
    TRIM(COALESCE(b.building_name || ' - ', '') || COALESCE(f.flat_number, 'Visitor destination'))::TEXT AS flat_label,
    v.resident_id,
    r.full_name::TEXT AS resident_name,
    v.vehicle_number::TEXT,
    v.photo_url::TEXT,
    v.entry_time,
    v.exit_time,
    COALESCE(cl.location_name, 'Gate')::TEXT AS entry_location_name,
    v.is_frequent_visitor,
    v.approval_status::TEXT,
    v.approval_deadline_at,
    v.decision_at,
    v.approved_by_resident,
    v.rejection_reason::TEXT
  FROM public.visitors v
  LEFT JOIN public.flats f ON f.id = v.flat_id
  LEFT JOIN public.buildings b ON b.id = f.building_id
  LEFT JOIN public.residents r ON r.id = v.resident_id
  LEFT JOIN public.company_locations cl ON cl.id = v.entry_location_id
  WHERE
    v.entry_guard_id = get_guard_id()
    AND (p_include_checked_out OR v.exit_time IS NULL)
  ORDER BY v.entry_time DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_resident_pending_visitors()
RETURNS TABLE (
  id UUID,
  visitor_name TEXT,
  phone TEXT,
  purpose TEXT,
  flat_id UUID,
  flat_label TEXT,
  vehicle_number TEXT,
  photo_url TEXT,
  entry_time TIMESTAMPTZ,
  approval_status TEXT,
  approval_deadline_at TIMESTAMPTZ,
  is_frequent_visitor BOOLEAN,
  rejection_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.expire_mobile_visitor_decisions();

  RETURN QUERY
  SELECT
    v.id,
    v.visitor_name::TEXT,
    v.phone::TEXT,
    v.purpose::TEXT,
    v.flat_id,
    TRIM(COALESCE(b.building_name || ' - ', '') || COALESCE(f.flat_number, 'Visitor destination'))::TEXT AS flat_label,
    v.vehicle_number::TEXT,
    v.photo_url::TEXT,
    v.entry_time,
    v.approval_status::TEXT,
    v.approval_deadline_at,
    v.is_frequent_visitor,
    v.rejection_reason::TEXT
  FROM public.visitors v
  JOIN public.residents r
    ON r.flat_id = v.flat_id
   AND r.auth_user_id = auth.uid()
  LEFT JOIN public.flats f ON f.id = v.flat_id
  LEFT JOIN public.buildings b ON b.id = f.building_id
  WHERE v.exit_time IS NULL
  ORDER BY v.entry_time DESC;
END;
$$;
