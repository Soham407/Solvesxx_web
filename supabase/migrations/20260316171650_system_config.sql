
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can manage system config" ON system_config;
DROP POLICY IF EXISTS "system_config_admin_full" ON system_config;
CREATE POLICY "system_config_admin_full"
  ON system_config FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND r.role_name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND r.role_name = 'admin'
    )
  );

INSERT INTO system_config (key, value, description)
VALUES ('guard_inactivity_threshold_minutes', '30',
        'Minutes of guard GPS inactivity before an alert is triggered. Default: 30.')
ON CONFLICT (key) DO NOTHING;
;
