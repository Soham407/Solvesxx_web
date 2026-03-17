CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
INSERT INTO system_config (key, value, description)
VALUES ('guard_inactivity_threshold_minutes', '30',
        'Minutes of guard GPS inactivity before an alert is triggered. Default: 30.')
ON CONFLICT (key) DO NOTHING;
