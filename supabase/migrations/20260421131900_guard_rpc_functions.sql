-- RPC Function: Record Guard GPS Tracking
-- Called by mobile app to record real-time GPS location during shift

CREATE OR REPLACE FUNCTION record_guard_gps_tracking(
  p_guard_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_accuracy_meters INT DEFAULT NULL,
  p_is_within_fence BOOLEAN DEFAULT true,
  p_shift_id UUID DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_tracking_id UUID;
BEGIN
  INSERT INTO guard_gps_tracking (
    guard_id,
    latitude,
    longitude,
    accuracy_meters,
    is_within_fence,
    shift_id
  ) VALUES (
    p_guard_id,
    p_latitude,
    p_longitude,
    p_accuracy_meters,
    p_is_within_fence,
    p_shift_id
  )
  RETURNING id INTO v_tracking_id;
  
  RETURN v_tracking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function: Trigger Panic Alert
-- Called by mobile app when guard presses SOS button

CREATE OR REPLACE FUNCTION trigger_panic_alert(
  p_guard_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_shift_id UUID DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO guard_panic_alerts (
    guard_id,
    latitude,
    longitude,
    shift_id,
    status
  ) VALUES (
    p_guard_id,
    p_latitude,
    p_longitude,
    p_shift_id,
    'active'
  )
  RETURNING id INTO v_alert_id;
  
  -- Trigger notification via Edge Function (implemented in production)
  -- This RPC just records the alert; actual SMS/push notifications
  -- are handled by backend services
  
  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function: Acknowledge Panic Alert
-- Called by manager to acknowledge receipt of panic alert

CREATE OR REPLACE FUNCTION acknowledge_panic_alert(
  p_alert_id UUID,
  p_acknowledged_by UUID
)
RETURNS boolean AS $$
BEGIN
  UPDATE guard_panic_alerts
  SET
    status = 'acknowledged',
    acknowledged_at = NOW(),
    acknowledged_by = p_acknowledged_by
  WHERE id = p_alert_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function: Resolve Panic Alert
-- Called by manager to mark alert as resolved

CREATE OR REPLACE FUNCTION resolve_panic_alert(
  p_alert_id UUID,
  p_resolved_by UUID,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  UPDATE guard_panic_alerts
  SET
    status = 'resolved',
    resolved_at = NOW(),
    resolved_by = p_resolved_by,
    resolution_notes = p_resolution_notes
  WHERE id = p_alert_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function: Get Active Panic Alerts
-- Called by manager dashboard to fetch unresolved alerts

CREATE OR REPLACE FUNCTION get_active_panic_alerts()
RETURNS TABLE (
  id UUID,
  guard_name TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  triggered_at TIMESTAMP WITH TIME ZONE,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pa.id,
    e.name,
    pa.latitude,
    pa.longitude,
    pa.triggered_at,
    pa.status
  FROM guard_panic_alerts pa
  JOIN employees e ON pa.guard_id = e.id
  WHERE pa.status IN ('active', 'acknowledged')
  ORDER BY pa.triggered_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function: Get Guard Location History
-- Called by manager to view guard's location trail during shift

CREATE OR REPLACE FUNCTION get_guard_location_history(
  p_guard_id UUID,
  p_hours_back INT DEFAULT 24
)
RETURNS TABLE (
  latitude NUMERIC,
  longitude NUMERIC,
  accuracy_meters INT,
  is_within_fence BOOLEAN,
  recorded_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ggt.latitude,
    ggt.longitude,
    ggt.accuracy_meters,
    ggt.is_within_fence,
    ggt.recorded_at
  FROM guard_gps_tracking ggt
  WHERE ggt.guard_id = p_guard_id
    AND ggt.recorded_at > NOW() - INTERVAL '1 hour' * p_hours_back
  ORDER BY ggt.recorded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants for functions
GRANT EXECUTE ON FUNCTION record_guard_gps_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_panic_alert TO authenticated;
GRANT EXECUTE ON FUNCTION acknowledge_panic_alert TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_panic_alert TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_panic_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION get_guard_location_history TO authenticated;
