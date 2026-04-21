-- Guard Panic Alerts Table
-- Tracks SOS/panic button activations with GPS location and resolution status

CREATE TABLE IF NOT EXISTS guard_panic_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guard_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES employees(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES employees(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_guard_panic_alerts_guard_id ON guard_panic_alerts(guard_id);
CREATE INDEX idx_guard_panic_alerts_status ON guard_panic_alerts(status);
CREATE INDEX idx_guard_panic_alerts_triggered_at ON guard_panic_alerts(triggered_at DESC);
CREATE INDEX idx_guard_panic_alerts_shift_id ON guard_panic_alerts(shift_id);

-- RLS Policies
ALTER TABLE guard_panic_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guards can view their own panic alerts"
  ON guard_panic_alerts FOR SELECT
  USING (
    auth.uid() = (SELECT auth_user_id FROM employees WHERE id = guard_id)
  );

CREATE POLICY "System can insert panic alerts"
  ON guard_panic_alerts FOR INSERT
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE guard_panic_alerts IS 'SOS/Panic button activations from guards. Tracks GPS location, recipients (manager + residents via SMS/push), and resolution status.';
COMMENT ON COLUMN guard_panic_alerts.status IS 'Alert lifecycle: active (just triggered) -> acknowledged (manager confirmed) -> resolved (handled)';
COMMENT ON COLUMN guard_panic_alerts.acknowledged_by IS 'Manager/supervisor who acknowledged the alert';
COMMENT ON COLUMN guard_panic_alerts.resolved_by IS 'Manager/supervisor who marked alert as resolved';
