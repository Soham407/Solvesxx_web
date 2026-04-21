-- Guard GPS Tracking Table
-- Tracks real-time guard locations during shifts for geofence monitoring and manager dashboard

CREATE TABLE IF NOT EXISTS guard_gps_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guard_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  accuracy_meters INT,
  is_within_fence BOOLEAN DEFAULT true,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_guard_gps_tracking_guard_id ON guard_gps_tracking(guard_id);
CREATE INDEX idx_guard_gps_tracking_recorded_at ON guard_gps_tracking(recorded_at DESC);
CREATE INDEX idx_guard_gps_tracking_shift_id ON guard_gps_tracking(shift_id);
CREATE INDEX idx_guard_gps_tracking_within_fence ON guard_gps_tracking(is_within_fence);

-- RLS Policies
ALTER TABLE guard_gps_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guards can view their own GPS tracking"
  ON guard_gps_tracking FOR SELECT
  USING (
    auth.uid() = (SELECT auth_user_id FROM employees WHERE id = guard_id)
  );

CREATE POLICY "System can insert GPS tracking"
  ON guard_gps_tracking FOR INSERT
  WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE guard_gps_tracking IS 'Real-time GPS location tracking for on-duty guards during shifts. Used for geofence monitoring, inactivity detection, and manager dashboard location tracking.';
COMMENT ON COLUMN guard_gps_tracking.guard_id IS 'Foreign key to employees table (guard)';
COMMENT ON COLUMN guard_gps_tracking.latitude IS 'Guard latitude (8 decimal places = ~1.1mm accuracy)';
COMMENT ON COLUMN guard_gps_tracking.longitude IS 'Guard longitude (8 decimal places = ~1.1mm accuracy)';
COMMENT ON COLUMN guard_gps_tracking.accuracy_meters IS 'GPS accuracy in meters (from device)';
COMMENT ON COLUMN guard_gps_tracking.is_within_fence IS 'Boolean flag indicating if guard is within assigned geofence';
COMMENT ON COLUMN guard_gps_tracking.recorded_at IS 'Timestamp when GPS reading was captured';
